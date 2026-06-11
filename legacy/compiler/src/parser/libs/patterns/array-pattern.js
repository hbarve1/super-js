function parseArrayPattern(parser) {
    parser.expect(parser.TokenType.LEFT_BRACKET);
    const elements = [];
    while (parser.current.type !== parser.TokenType.RIGHT_BRACKET && parser.current.type !== parser.TokenType.EOF) {
        if (parser.current.type === parser.TokenType.IDENTIFIER) {
            elements.push({ type: 'Identifier', name: parser.current.value });
            parser.advance();
        } else if (parser.current.type === parser.TokenType.COMMA) {
            elements.push(null); // Allow holes
            parser.advance();
        } else if (parser.current.type === parser.TokenType.RIGHT_BRACKET) {
            break;
        } else {
            parser.advance();
        }
        if (parser.current.type === parser.TokenType.COMMA) {
            parser.advance();
        }
    }
    parser.expect(parser.TokenType.RIGHT_BRACKET);
    return { type: 'ArrayPattern', elements };
}

module.exports = parseArrayPattern;
