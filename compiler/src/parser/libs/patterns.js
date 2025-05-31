// Pattern parsing helpers for Parser

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
            // For now, skip unsupported pattern elements
            parser.advance();
        }
        if (parser.current.type === parser.TokenType.COMMA) {
            parser.advance();
        }
    }
    parser.expect(parser.TokenType.RIGHT_BRACKET);
    return { type: 'ArrayPattern', elements };
}

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
                    // Nested object pattern
                    value = parseObjectPattern(parser);
                } else if (parser.current.type === parser.TokenType.LEFT_BRACKET) {
                    // Nested array pattern
                    value = parseArrayPattern(parser);
                }
            }
            properties.push({ key, value });
        } else if (parser.current.type === parser.TokenType.COMMA) {
            parser.advance();
        } else if (parser.current.type === parser.TokenType.RIGHT_BRACE) {
            break;
        } else {
            // For now, skip unsupported pattern elements
            parser.advance();
        }
    }
    parser.expect(parser.TokenType.RIGHT_BRACE);
    return { type: 'ObjectPattern', properties };
}

module.exports = {
    parseArrayPattern,
    parseObjectPattern
}; 