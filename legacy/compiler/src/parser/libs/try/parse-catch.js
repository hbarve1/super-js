// Handles parsing the catch clause for try statements
function parseCatchClause(parser) {
    let handler = null;
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'catch') {
        parser.advance();
        let param = null;
        if (parser.current.type === parser.TokenType.LEFT_PAREN) {
            parser.advance();
            if (parser.current.type === parser.TokenType.IDENTIFIER) {
                param = parser.current.value;
                parser.advance();
            }
            while (parser.current.type !== parser.TokenType.RIGHT_PAREN && parser.current.type !== parser.TokenType.EOF) {
                parser.advance();
            }
            if (parser.current.type === parser.TokenType.RIGHT_PAREN) parser.advance();
        }
        let catchBlock = null;
        if (parser.current.type === parser.TokenType.LEFT_BRACE) {
            catchBlock = parser.parseBlockStatement();
        } else {
            catchBlock = { type: 'BlockStatement', body: [] };
        }
        handler = { param, body: catchBlock };
    }
    return handler;
}

module.exports = { parseCatchClause };
