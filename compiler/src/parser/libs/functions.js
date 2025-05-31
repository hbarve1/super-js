// Function parsing helpers for Parser

function _parseGenerics(parser) {
    if (parser.current.type !== parser.TokenType.LEFT_ANGLE) return null;
    parser.advance();
    const generics = [];
    while (parser.current.type !== parser.TokenType.RIGHT_ANGLE && parser.current.type !== parser.TokenType.EOF) {
        if (parser.current.type === parser.TokenType.IDENTIFIER) {
            generics.push(parser.current.value);
            parser.advance();
        }
        if (parser.current.type === parser.TokenType.COMMA) {
            parser.advance();
        } else if (parser.current.type !== parser.TokenType.RIGHT_ANGLE) {
            break;
        }
    }
    parser.expect(parser.TokenType.RIGHT_ANGLE);
    return generics;
}

function _parseFunctionParams(parser) {
    parser.expect(parser.TokenType.LEFT_PAREN);
    const params = [];
    while (parser.current.type !== parser.TokenType.RIGHT_PAREN && parser.current.type !== parser.TokenType.EOF) {
        if (parser.current.type === parser.TokenType.IDENTIFIER) {
            const paramName = parser.current.value;
            parser.advance();
            let varType = null;
            if (parser.current.type === parser.TokenType.COLON) {
                parser.advance();
                varType = parser.parseTypeAnnotation();
            }
            params.push({ name: paramName, varType });
            if (parser.current.type === parser.TokenType.COMMA) {
                parser.advance();
            } else if (parser.current.type !== parser.TokenType.RIGHT_PAREN) {
                break;
            }
        } else {
            // Skip unexpected tokens in params
            parser.advance();
        }
    }
    parser.expect(parser.TokenType.RIGHT_PAREN);
    return params;
}

function parseFunctionDeclaration(parser) {
    // Support async and generator functions
    let isAsync = false;
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'async') {
        isAsync = true;
        parser.advance();
    }
    parser.expect(parser.TokenType.KEYWORD, 'function');
    let isGenerator = false;
    if (parser.current.type === parser.TokenType.OPERATOR && parser.current.value === '*') {
        isGenerator = true;
        parser.advance();
    }
    // Parse function name
    const idToken = parser.expect(parser.TokenType.IDENTIFIER);
    // Parse generics
    const generics = _parseGenerics(parser);
    // Parse parameter list
    const params = _parseFunctionParams(parser);
    // Optional return type
    let returnType = null;
    if (parser.current.type === parser.TokenType.COLON) {
        parser.advance();
        returnType = parser.parseTypeAnnotation();
    }
    // Parse body
    const body = parser.parseBlockStatement();
    return {
        type: 'FunctionDeclaration',
        id: idToken.value,
        params,
        returnType,
        isGenerator,
        isAsync,
        generics,
        body
    };
}

function parseMethodDefinition(parser, key) {
    // Parse params
    const params = _parseFunctionParams(parser);
    // Optional return type
    let returnType = null;
    if (parser.current.type === parser.TokenType.COLON) {
        parser.advance();
        if (parser.current.type === parser.TokenType.KEYWORD || parser.current.type === parser.TokenType.IDENTIFIER) {
            returnType = parser.current.value;
            parser.advance();
        }
    }
    // Parse body
    const body = parser.parseBlockStatement();
    return {
        type: 'MethodDefinition',
        key,
        params,
        returnType,
        body
    };
}

module.exports = {
    parseFunctionDeclaration,
    parseMethodDefinition,
    _parseGenerics,
    _parseFunctionParams
}; 