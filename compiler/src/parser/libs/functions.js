// Function parsing helpers for Parser

const { FUNCTION_DECLARATION, METHOD_DEFINITION } = require('../../utils/ast-node-types');

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
        let isRest = false;
        if (parser.current.type === parser.TokenType.OPERATOR && parser.current.value === '...') {
            isRest = true;
            parser.advance();
        }
        let param = null;
        let varType = null;
        let defaultValue = null;
        // Support destructured patterns
        if (parser.current.type === parser.TokenType.LEFT_BRACE) {
            param = parser.parseObjectPattern();
            if (parser.current.type === parser.TokenType.COLON) {
                parser.advance();
                varType = parser.parseTypeAnnotation();
            }
            if (parser.current.type === parser.TokenType.ASSIGNMENT && parser.current.value === '=') {
                parser.advance();
                defaultValue = parser.parseExpression();
            }
        } else if (parser.current.type === parser.TokenType.LEFT_BRACKET) {
            param = parser.parseArrayPattern();
            if (parser.current.type === parser.TokenType.COLON) {
                parser.advance();
                varType = parser.parseTypeAnnotation();
            }
            if (parser.current.type === parser.TokenType.ASSIGNMENT && parser.current.value === '=') {
                parser.advance();
                defaultValue = parser.parseExpression();
            }
        } else if (parser.current.type === parser.TokenType.IDENTIFIER) {
            const paramName = parser.current.value;
            parser.advance();
            if (parser.current.type === parser.TokenType.COLON) {
                parser.advance();
                varType = parser.parseTypeAnnotation();
            }
            if (parser.current.type === parser.TokenType.ASSIGNMENT && parser.current.value === '=') {
                parser.advance();
                defaultValue = parser.parseExpression();
            }
            param = paramName;
        } else {
            // Skip unexpected tokens in params
            parser.advance();
            continue;
        }
        params.push({ name: param, varType, defaultValue, isRest });
        if (parser.current.type === parser.TokenType.COMMA) {
            parser.advance();
        } else if (parser.current.type !== parser.TokenType.RIGHT_PAREN) {
            break;
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
        type: FUNCTION_DECLARATION,
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
        type: METHOD_DEFINITION,
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