// Block statement parsing helper for Parser

function parseBlockStatement(parser) {
    parser.expect(parser.TokenType.LEFT_BRACE);
    const body = [];
    while (parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF) {
        const stmt = parser.parseStatement();
        if (stmt) body.push(stmt);
    }
    parser.expect(parser.TokenType.RIGHT_BRACE);
    return { type: 'BlockStatement', body };
}

module.exports = {
    parseBlockStatement
}; 