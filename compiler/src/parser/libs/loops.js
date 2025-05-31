// Loop parsing helpers for Parser

function parseForStatement(parser) {
    parser.expect(parser.TokenType.KEYWORD, 'for');
    parser.expect(parser.TokenType.LEFT_PAREN);
    let init = null;
    if (parser.current.type === parser.TokenType.KEYWORD && ['let', 'const', 'var'].includes(parser.current.value)) {
        init = parser.parseVariableDeclaration();
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
        body = { type: 'BlockStatement', body: [] };
    }
    return {
        type: 'ForStatement',
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
        body = { type: 'BlockStatement', body: [] };
    }
    return {
        type: 'WhileStatement',
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
        body = { type: 'BlockStatement', body: [] };
    }
    parser.expect(parser.TokenType.KEYWORD, 'while');
    parser.expect(parser.TokenType.LEFT_PAREN);
    // Use parseExpression for test
    let test = parser.parseExpression();
    parser.expect(parser.TokenType.RIGHT_PAREN);
    // Optionally expect SEMICOLON
    if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
    return {
        type: 'DoWhileStatement',
        body,
        test
    };
}

module.exports = {
    parseForStatement,
    parseWhileStatement,
    parseDoWhileStatement
}; 