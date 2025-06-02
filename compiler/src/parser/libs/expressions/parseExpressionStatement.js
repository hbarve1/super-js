
function parseExpressionStatement(parser) {
    // Skip until semicolon or block end
    while (
        parser.current.type !== parser.TokenType.SEMICOLON &&
        parser.current.type !== parser.TokenType.RIGHT_BRACE &&
        parser.current.type !== parser.TokenType.EOF
    ) {
        parser.advance();
    }
    if (parser.current.type === parser.TokenType.SEMICOLON || parser.current.type === parser.TokenType.RIGHT_BRACE) parser.advance();
    return { type: 'ExpressionStatement', skipped: true };
}

module.exports = {
    parseExpressionStatement
}; 
