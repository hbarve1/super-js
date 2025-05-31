// Expression parsing helpers for Parser

function parseExpression(parser, precedence = 0) {
    let left = parsePrimaryExpression(parser);
    while (true) {
        if (parser.current.type === parser.TokenType.DOT) {
            parser.advance();
            if (parser.current.type === parser.TokenType.IDENTIFIER) {
                left = {
                    type: 'MemberExpression',
                    object: left,
                    property: { type: 'Identifier', name: parser.current.value },
                    computed: false
                };
                parser.advance();
                continue;
            }
        } else if (parser.current.type === parser.TokenType.LEFT_BRACKET) {
            parser.advance();
            const property = parseExpression(parser);
            parser.expect(parser.TokenType.RIGHT_BRACKET);
            left = {
                type: 'MemberExpression',
                object: left,
                property,
                computed: true
            };
            continue;
        } else if (parser.current.type === parser.TokenType.LEFT_PAREN) {
            parser.advance();
            const args = [];
            while (parser.current.type !== parser.TokenType.RIGHT_PAREN && parser.current.type !== parser.TokenType.EOF) {
                args.push(parseExpression(parser));
                if (parser.current.type === parser.TokenType.COMMA) {
                    parser.advance();
                } else {
                    break;
                }
            }
            parser.expect(parser.TokenType.RIGHT_PAREN);
            left = {
                type: 'CallExpression',
                callee: left,
                arguments: args
            };
            continue;
        }
        if (parser.current.type === parser.TokenType.QUESTION_MARK && precedence <= 1) {
            parser.advance();
            const consequent = parseExpression(parser);
            parser.expect(parser.TokenType.COLON);
            const alternate = parseExpression(parser);
            left = {
                type: 'ConditionalExpression',
                test: left,
                consequent,
                alternate
            };
            continue;
        }
        if (parser.current.type === parser.TokenType.ASSIGNMENT || (parser.current.type === parser.TokenType.OPERATOR && ['+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '>>>='].includes(parser.current.value))) {
            if (precedence > 0) break;
            const operator = parser.current.value;
            parser.advance();
            const right = parseExpression(parser, 0);
            left = {
                type: 'AssignmentExpression',
                operator,
                left,
                right
            };
            continue;
        }
        if (parser.current.type === parser.TokenType.OPERATOR && (parser.current.value === '++' || parser.current.value === '--')) {
            const operator = parser.current.value;
            parser.advance();
            left = {
                type: 'UpdateExpression',
                operator,
                argument: left,
                prefix: false
            };
            continue;
        }
        if (isBinaryOperator(parser.current) && getPrecedence(parser.current) > precedence) {
            const opToken = parser.current;
            const opPrecedence = getPrecedence(opToken);
            parser.advance();
            const right = parseExpression(parser, opPrecedence);
            left = {
                type: 'BinaryExpression',
                operator: opToken.value,
                left,
                right
            };
            continue;
        }
        break;
    }
    return left;
}

function parsePrimaryExpression(parser) {
    if (parser.current.type === parser.TokenType.OPERATOR && (parser.current.value === '++' || parser.current.value === '--')) {
        const operator = parser.current.value;
        parser.advance();
        const argument = parsePrimaryExpression(parser);
        return {
            type: 'UpdateExpression',
            operator,
            argument,
            prefix: true
        };
    }
    if (
        (parser.current.type === parser.TokenType.OPERATOR && ['!', '+', '-', '~'].includes(parser.current.value)) ||
        (parser.current.type === parser.TokenType.KEYWORD && ['typeof', 'void', 'delete'].includes(parser.current.value))
    ) {
        const operator = parser.current.value;
        parser.advance();
        const argument = parsePrimaryExpression(parser);
        return {
            type: 'UnaryExpression',
            operator,
            argument,
            prefix: true
        };
    }
    if (parser.current.type === parser.TokenType.LEFT_PAREN) {
        const startPos = parser.position;
        const startToken = parser.current;
        let pos = parser.position + 1;
        let params = [];
        let validParams = true;
        let paramTokens = [];
        let parenDepth = 1;
        while (pos < parser.tokens.length && parenDepth > 0) {
            const token = parser.tokens[pos];
            if (token.type === parser.TokenType.LEFT_PAREN) parenDepth++;
            if (token.type === parser.TokenType.RIGHT_PAREN) parenDepth--;
            if (parenDepth === 1 && token.type === parser.TokenType.IDENTIFIER) {
                let paramName = token.value;
                let varType = null;
                let next = parser.tokens[pos + 1];
                if (next && next.type === parser.TokenType.COLON) {
                    let typeToken = parser.tokens[pos + 2];
                    if (typeToken && (typeToken.type === parser.TokenType.KEYWORD || typeToken.type === parser.TokenType.IDENTIFIER)) {
                        varType = typeToken.value;
                        pos += 2;
                    }
                }
                params.push({ name: paramName, varType });
            }
            paramTokens.push(token);
            pos++;
        }
        let afterParen = parser.tokens[pos];
        let returnType = null;
        let arrowPos = pos;
        if (afterParen && afterParen.type === parser.TokenType.COLON) {
            let typeToken = parser.tokens[pos + 1];
            if (typeToken && (typeToken.type === parser.TokenType.KEYWORD || typeToken.type === parser.TokenType.IDENTIFIER)) {
                returnType = typeToken.value;
                arrowPos = pos + 2;
                afterParen = parser.tokens[arrowPos];
            }
        }
        if (afterParen && afterParen.type === parser.TokenType.OPERATOR && afterParen.value === '=>') {
            parser.advance();
            while (parser.current.type !== parser.TokenType.RIGHT_PAREN && parser.current.type !== parser.TokenType.EOF) {
                parser.advance();
            }
            parser.expect(parser.TokenType.RIGHT_PAREN);
            if (returnType !== null) {
                parser.expect(parser.TokenType.COLON);
                parser.advance();
            }
            parser.expect(parser.TokenType.OPERATOR, '=>');
            let body;
            if (parser.current.type === parser.TokenType.LEFT_BRACE) {
                body = parser.parseBlockStatement();
            } else {
                body = parseExpression(parser);
            }
            return {
                type: 'ArrowFunctionExpression',
                params,
                returnType,
                body
            };
        } else {
            parser.advance();
            const expr = parseExpression(parser);
            parser.expect(parser.TokenType.RIGHT_PAREN);
            return expr;
        }
    }
    if (parser.current.type === parser.TokenType.IDENTIFIER && parser.peek().type === parser.TokenType.OPERATOR && parser.peek().value === '=>') {
        const paramName = parser.current.value;
        parser.advance();
        parser.expect(parser.TokenType.OPERATOR, '=>');
        let body;
        if (parser.current.type === parser.TokenType.LEFT_BRACE) {
            body = parser.parseBlockStatement();
        } else {
            body = parseExpression(parser);
        }
        return {
            type: 'ArrowFunctionExpression',
            params: [{ name: paramName, varType: null }],
            returnType: null,
            body
        };
    }
    if (parser.current.type === parser.TokenType.NUMBER) {
        const value = parser.current.value;
        parser.advance();
        return { type: 'Literal', value };
    }
    if (parser.current.type === parser.TokenType.STRING) {
        const value = parser.current.value;
        parser.advance();
        return { type: 'Literal', value };
    }
    if (parser.current.type === parser.TokenType.KEYWORD && ['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'].includes(parser.current.value)) {
        let value;
        switch (parser.current.value) {
            case 'true': value = true; break;
            case 'false': value = false; break;
            case 'null': value = null; break;
            case 'undefined': value = undefined; break;
            case 'NaN': value = NaN; break;
            case 'Infinity': value = Infinity; break;
        }
        parser.advance();
        return { type: 'Literal', value };
    }
    if (parser.current.type === parser.TokenType.IDENTIFIER) {
        const name = parser.current.value;
        parser.advance();
        return { type: 'Identifier', name };
    }
    if (parser.current.type === parser.TokenType.LEFT_PAREN) {
        parser.advance();
        const expr = parseExpression(parser);
        parser.expect(parser.TokenType.RIGHT_PAREN);
        return expr;
    }
    if (parser.current.type === parser.TokenType.LEFT_BRACKET) {
        parser.advance();
        const elements = [];
        while (parser.current.type !== parser.TokenType.RIGHT_BRACKET && parser.current.type !== parser.TokenType.EOF) {
            if (parser.current.type === parser.TokenType.COMMA) {
                elements.push(null);
                parser.advance();
                continue;
            }
            elements.push(parseExpression(parser));
            if (parser.current.type === parser.TokenType.COMMA) {
                parser.advance();
            } else {
                break;
            }
        }
        parser.expect(parser.TokenType.RIGHT_BRACKET);
        return { type: 'ArrayExpression', elements };
    }
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        parser.advance();
        const properties = [];
        while (parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF) {
            let key = null;
            if (parser.current.type === parser.TokenType.IDENTIFIER) {
                key = { type: 'Identifier', name: parser.current.value };
                parser.advance();
            } else if (parser.current.type === parser.TokenType.STRING) {
                key = { type: 'Literal', value: parser.current.value };
                parser.advance();
            } else {
                break;
            }
            parser.expect(parser.TokenType.COLON);
            const value = parseExpression(parser);
            properties.push({ key, value });
            if (parser.current.type === parser.TokenType.COMMA) {
                parser.advance();
            } else {
                break;
            }
        }
        parser.expect(parser.TokenType.RIGHT_BRACE);
        return { type: 'ObjectExpression', properties };
    }
    parser.advance();
    return { type: 'Expression', stub: true };
}

function isBinaryOperator(token) {
    return token.type === 'OPERATOR' || token.type === 'ASSIGNMENT';
}

function getPrecedence(token) {
    const op = token.value;
    if (op === '===') return 3;
    if (op === '!==') return 3;
    if (op === '+' || op === '-') return 2;
    if (op === '*' || op === '/') return 4;
    if (op === '=') return 1;
    return 0;
}

function parseExpressionStatement(parser) {
    // Skip until semicolon or block end
    while (
        parser.current.type !== parser.TokenType.SEMICOLON &&
        parser.current.type !== parser.TokenType.RIGHT_BRACE &&
        parser.current.type !== parser.TokenType.EOF
    ) {
        parser.advance();
    }
    if (parser.current.type === parser.TokenType.SEMICOLON || parser.current.type === parser.TokenType.RIGHT_BRACE) parser.advance();
    return { type: 'ExpressionStatement', skipped: true };
}

module.exports = {
    parseExpression,
    parsePrimaryExpression,
    isBinaryOperator,
    getPrecedence,
    parseExpressionStatement
}; 