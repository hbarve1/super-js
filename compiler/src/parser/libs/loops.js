// Loop parsing helpers for Parser

const { FOR_STATEMENT, WHILE_STATEMENT, DO_WHILE_STATEMENT, BLOCK_STATEMENT } = require('../../utils/ast-node-types');

function parseForStatement(parser) {
    parser.expect(parser.TokenType.KEYWORD, 'for');
    parser.expect(parser.TokenType.LEFT_PAREN);
    let init = null;
    if (parser.current.type === parser.TokenType.KEYWORD && ['let', 'const', 'var'].includes(parser.current.value)) {
        try {
            init = parser.parseVariableDeclaration(true);
            // If parseVariableDeclaration returns null (e.g., for empty declaration), treat as valid (init = null)
        } catch (e) {
            // If variable declaration is invalid, recover by setting init to null
            init = null;
            // Advance to next semicolon or right paren to recover
            while (parser.current.type !== parser.TokenType.SEMICOLON && parser.current.type !== parser.TokenType.RIGHT_PAREN && parser.current.type !== parser.TokenType.EOF) {
                parser.advance();
            }
        }
        // Do not treat null init as an error; continue parsing
    } else if (parser.current.type !== parser.TokenType.SEMICOLON) {
        init = parser.parseExpression();
        if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
    } else {
        // No init
        parser.advance();
    }
    let test = null;
    if (parser.current.type !== parser.TokenType.SEMICOLON) {
        test = parser.parseExpression();
    }
    parser.expect(parser.TokenType.SEMICOLON);
    let update = null;
    if (parser.current.type !== parser.TokenType.RIGHT_PAREN) {
        update = parser.parseExpression();
    }
    parser.expect(parser.TokenType.RIGHT_PAREN);
    // Parse body
    let body = null;
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        body = parser.parseBlockStatement();
    } else {
        // Skip single statement
        if (parser.current.type !== parser.TokenType.EOF) parser.advance();
        body = { type: BLOCK_STATEMENT, body: [] };
    }
    return {
        type: FOR_STATEMENT,
        init,
        test,
        update,
        body
    };
}

function parseWhileStatement(parser) {
    parser.expect(parser.TokenType.KEYWORD, 'while');
    parser.expect(parser.TokenType.LEFT_PAREN);
    // Use parseExpression for test
    let test = parser.parseExpression();
    parser.expect(parser.TokenType.RIGHT_PAREN);
    // Parse body
    let body = null;
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        body = parser.parseBlockStatement();
    } else {
        // Skip single statement
        if (parser.current.type !== parser.TokenType.EOF) parser.advance();
        body = { type: BLOCK_STATEMENT, body: [] };
    }
    return {
        type: WHILE_STATEMENT,
        test,
        body
    };
}

function parseDoWhileStatement(parser) {
    parser.expect(parser.TokenType.KEYWORD, 'do');
    // Parse body
    let body = null;
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        body = parser.parseBlockStatement();
    } else {
        // Skip single statement
        if (parser.current.type !== parser.TokenType.EOF) parser.advance();
        body = { type: BLOCK_STATEMENT, body: [] };
    }
    parser.expect(parser.TokenType.KEYWORD, 'while');
    parser.expect(parser.TokenType.LEFT_PAREN);
    // Use parseExpression for test
    let test = parser.parseExpression();
    parser.expect(parser.TokenType.RIGHT_PAREN);
    // Optionally expect SEMICOLON
    if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
    return {
        type: DO_WHILE_STATEMENT,
        body,
        test
    };
}

module.exports = {
    parseForStatement,
    parseWhileStatement,
    parseDoWhileStatement
}; 