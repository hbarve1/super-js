function _parseGenerics(parser) {
    if (parser.current.type !== parser.TokenType.LEFT_ANGLE) return null;
    parser.advance();
    const generics = [];
    while (parser.current.type !== parser.TokenType.RIGHT_ANGLE && parser.current.type !== parser.TokenType.EOF) {
        if (parser.current.type === parser.TokenType.IDENTIFIER) {
            generics.push(parser.current.value);
            parser.advance();
        }
        if (parser.current.type === parser.TokenType.COMMA) {
            parser.advance();
        } else if (parser.current.type !== parser.TokenType.RIGHT_ANGLE) {
            break;
        }
    }
    parser.expect(parser.TokenType.RIGHT_ANGLE);
    return generics;
}

module.exports = _parseGenerics;
