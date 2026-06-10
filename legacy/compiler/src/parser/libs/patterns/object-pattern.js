function parseObjectPattern(parser) {
    parser.expect(parser.TokenType.LEFT_BRACE);
    const properties = [];
    while (parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF) {
        if (parser.current.type === parser.TokenType.IDENTIFIER) {
            const key = parser.current.value;
            parser.advance();
            let value = { type: 'Identifier', name: key };
            if (parser.current.type === parser.TokenType.COLON) {
                parser.advance();
                if (parser.current.type === parser.TokenType.IDENTIFIER) {
                    value = { type: 'Identifier', name: parser.current.value };
                    parser.advance();
                } else if (parser.current.type === parser.TokenType.LEFT_BRACE) {
                    value = parseObjectPattern(parser);
                } else if (parser.current.type === parser.TokenType.LEFT_BRACKET) {
                    value = parseArrayPattern(parser);
                }
            }
            properties.push({ key, value });
        } else if (parser.current.type === parser.TokenType.COMMA) {
            parser.advance();
        } else if (parser.current.type === parser.TokenType.RIGHT_BRACE) {
            break;
        } else {
            parser.advance();
        }
    }
    parser.expect(parser.TokenType.RIGHT_BRACE);
    return { type: 'ObjectPattern', properties };
}

const parseArrayPattern = require('./array-pattern');
module.exports = parseObjectPattern;
