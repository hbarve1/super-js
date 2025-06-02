// Variable declaration parsing helper for Parser

const { VARIABLE_DECLARATION } = require('../../../utils/ast-node-types');

function parseVariableDeclaration(parser, inForLoop = false) {
    // let|const|var IDENTIFIER [: TYPE] [= expr] [, ...] ;
    if (
        parser.current.type !== parser.TokenType.KEYWORD ||
        !['let', 'const', 'var'].includes(parser.current.value)
    ) {
        throw new Error('Expected variable declaration keyword');
    }
    const kindToken = parser.current;
    parser.advance();
    const declarations = [];
    let first = true;
    while (true) {
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
        let init = null;
        if (!invalidDeclarator && parser.current.type === parser.TokenType.ASSIGNMENT) {
            parser.advance();
            try {
                init = parser.parseExpression();
            } catch (e) {
                init = { type: 'Expression', stub: true, error: e.message };
                // Attempt to recover: skip to comma or semicolon
                while (parser.current.type !== parser.TokenType.COMMA && parser.current.type !== parser.TokenType.SEMICOLON && parser.current.type !== parser.TokenType.EOF) {
                    parser.advance();
                }
            }
        }
        // Disallow const without initializer
        if (!invalidDeclarator && kindToken.value === 'const' && init == null) {
            invalidDeclarator = true;
        }
        if (!invalidDeclarator) {
            declarations.push({
                type: VARIABLE_DECLARATION,
                kind: kindToken.value,
                id: idNode,
                varType,
                init
            });
        } else if (first) {
            // Do NOT consume or advance past the semicolon here; let parseProgram handle it
            throw new Error('Invalid variable declarator');
        }
        first = false;
        if (parser.current.type === parser.TokenType.SEMICOLON) {
            parser.advance();
            return declarations.length === 1 ? declarations[0] : declarations;
        }
        if (parser.current.type === parser.TokenType.COMMA) {
            parser.advance();
            continue;
        } else {
            // In for-loop header, allow declaration without semicolon
            if (inForLoop && (parser.current.type === parser.TokenType.RIGHT_PAREN || parser.current.type === parser.TokenType.SEMICOLON)) {
                return declarations.length === 1 ? declarations[0] : declarations;
            }
            break;
        }
    }
    // If not at a semicolon, treat as invalid (do not add to AST)
    if (inForLoop && declarations.length > 0) {
        return declarations.length === 1 ? declarations[0] : declarations;
    }
    return null;
}

module.exports = {
    parseVariableDeclaration
}; 