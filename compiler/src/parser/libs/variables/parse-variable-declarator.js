// Handles parsing a single variable declarator (id, type, init)
function parseVariableDeclarator(parser) {
    let idNode = null;
    let varType = null;
    let invalidDeclarator = false;
    if (parser.current.type === parser.TokenType.LEFT_BRACKET) {
        try {
            idNode = parser.parseArrayPattern();
            if (parser.current.type === parser.TokenType.COLON) {
                parser.advance();
                if (
                    parser.current.type !== parser.TokenType.IDENTIFIER &&
                    parser.current.type !== parser.TokenType.KEYWORD &&
                    parser.current.type !== parser.TokenType.LEFT_BRACE &&
                    parser.current.type !== parser.TokenType.LEFT_BRACKET &&
                    parser.current.type !== parser.TokenType.LEFT_PAREN
                ) {
                    invalidDeclarator = true;
                } else {
                    varType = parser.parseTypeAnnotation();
                }
            }
        } catch (e) {
            invalidDeclarator = true;
        }
    } else if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        try {
            idNode = parser.parseObjectPattern();
            if (parser.current.type === parser.TokenType.COLON) {
                parser.advance();
                if (
                    parser.current.type !== parser.TokenType.IDENTIFIER &&
                    parser.current.type !== parser.TokenType.KEYWORD &&
                    parser.current.type !== parser.TokenType.LEFT_BRACE &&
                    parser.current.type !== parser.TokenType.LEFT_BRACKET &&
                    parser.current.type !== parser.TokenType.LEFT_PAREN
                ) {
                    invalidDeclarator = true;
                } else {
                    varType = parser.parseTypeAnnotation();
                }
            }
        } catch (e) {
            invalidDeclarator = true;
        }
    } else {
        if (parser.current.type !== parser.TokenType.IDENTIFIER) {
            invalidDeclarator = true;
        } else {
            try {
                const idToken = parser.expect(parser.TokenType.IDENTIFIER);
                idNode = idToken.value;
                if (parser.current.type === parser.TokenType.COLON) {
                    parser.advance();
                    if (
                        parser.current.type !== parser.TokenType.IDENTIFIER &&
                        parser.current.type !== parser.TokenType.KEYWORD &&
                        parser.current.type !== parser.TokenType.LEFT_BRACE &&
                        parser.current.type !== parser.TokenType.LEFT_BRACKET &&
                        parser.current.type !== parser.TokenType.LEFT_PAREN
                    ) {
                        invalidDeclarator = true;
                    } else {
                        varType = parser.parseTypeAnnotation();
                    }
                }
            } catch (e) {
                invalidDeclarator = true;
            }
        }
    }
    return { idNode, varType, invalidDeclarator };
}

module.exports = { parseVariableDeclarator };
