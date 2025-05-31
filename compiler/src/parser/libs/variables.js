// Variable declaration parsing helper for Parser

function parseVariableDeclaration(parser) {
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
        let invalidDeclarator = false;
        if (parser.current.type === parser.TokenType.LEFT_BRACKET) {
            // Allow empty array pattern
            idNode = parser.parseArrayPattern();
        } else if (parser.current.type === parser.TokenType.LEFT_BRACE) {
            // Allow empty object pattern
            idNode = parser.parseObjectPattern();
        } else {
            if (parser.current.type !== parser.TokenType.IDENTIFIER) {
                invalidDeclarator = true;
            } else {
                const idToken = parser.expect(parser.TokenType.IDENTIFIER);
                idNode = idToken.value;
            }
        }
        let varType = null;
        if (!invalidDeclarator && parser.current.type === parser.TokenType.COLON) {
            parser.advance();
            varType = parser.parseTypeAnnotation();
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
                type: 'VariableDeclaration',
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
            break;
        }
    }
    // If not at a semicolon, treat as invalid (do not add to AST)
    return null;
}

module.exports = {
    parseVariableDeclaration
}; 