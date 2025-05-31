// Conditional statement parsing helpers for Parser

function parseIfStatement(parser) {
    parser.expect(parser.TokenType.KEYWORD, 'if');
    parser.expect(parser.TokenType.LEFT_PAREN);
    // Use parseExpression for test
    let test = parser.parseExpression();
    parser.expect(parser.TokenType.RIGHT_PAREN);
    // Parse consequent (then branch)
    let consequent = null;
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        consequent = parser.parseBlockStatement();
    } else {
        // Skip single statement
        if (parser.current.type !== parser.TokenType.EOF) parser.advance();
        consequent = { type: 'BlockStatement', body: [] };
    }
    // Parse alternate (else branch)
    let alternate = null;
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'else') {
        parser.advance();
        if (parser.current.type === parser.TokenType.LEFT_BRACE) {
            alternate = parser.parseBlockStatement();
        } else {
            // Skip single statement
            if (parser.current.type !== parser.TokenType.EOF) parser.advance();
            alternate = { type: 'BlockStatement', body: [] };
        }
    }
    return {
        type: 'IfStatement',
        test,
        consequent,
        alternate
    };
}

function parseSwitchStatement(parser) {
    parser.expect(parser.TokenType.KEYWORD, 'switch');
    parser.expect(parser.TokenType.LEFT_PAREN);
    // Parse discriminant
    let discriminant = parser.parseExpression();
    parser.expect(parser.TokenType.RIGHT_PAREN);
    const cases = [];
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        parser.advance();
        while (parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF) {
            if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'case') {
                parser.advance();
                const test = parser.parseExpression();
                parser.expect(parser.TokenType.COLON);
                const consequent = [];
                while (
                    (parser.current.type !== parser.TokenType.KEYWORD || (parser.current.value !== 'case' && parser.current.value !== 'default')) &&
                    parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF
                ) {
                    const stmt = parser.parseStatement();
                    if (stmt) consequent.push(stmt);
                }
                cases.push({ type: 'SwitchCase', test, consequent });
            } else if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'default') {
                parser.advance();
                parser.expect(parser.TokenType.COLON);
                const consequent = [];
                while (
                    (parser.current.type !== parser.TokenType.KEYWORD || (parser.current.value !== 'case' && parser.current.value !== 'default')) &&
                    parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF
                ) {
                    const stmt = parser.parseStatement();
                    if (stmt) consequent.push(stmt);
                }
                cases.push({ type: 'SwitchCase', test: null, consequent });
            } else {
                parser.advance();
            }
        }
        parser.expect(parser.TokenType.RIGHT_BRACE);
    }
    return {
        type: 'SwitchStatement',
        discriminant,
        cases
    };
}

module.exports = {
    parseIfStatement,
    parseSwitchStatement
}; 