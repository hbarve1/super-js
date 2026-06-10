function _parseFunctionParams(parser) {
    parser.expect(parser.TokenType.LEFT_PAREN);
    const params = [];
    while (parser.current.type !== parser.TokenType.RIGHT_PAREN && parser.current.type !== parser.TokenType.EOF) {
        let isRest = false;
        if (parser.current.type === parser.TokenType.OPERATOR && parser.current.value === '...') {
            isRest = true;
            parser.advance();
        }
        let param = null;
        let varType = null;
        let defaultValue = null;
        if (parser.current.type === parser.TokenType.LEFT_BRACE) {
            param = parser.parseObjectPattern();
            if (parser.current.type === parser.TokenType.COLON) {
                parser.advance();
                varType = parser.parseTypeAnnotation();
            }
            if (parser.current.type === parser.TokenType.ASSIGNMENT && parser.current.value === '=') {
                parser.advance();
                defaultValue = parser.parseExpression();
            }
        } else if (parser.current.type === parser.TokenType.LEFT_BRACKET) {
            param = parser.parseArrayPattern();
            if (parser.current.type === parser.TokenType.COLON) {
                parser.advance();
                varType = parser.parseTypeAnnotation();
            }
            if (parser.current.type === parser.TokenType.ASSIGNMENT && parser.current.value === '=') {
                parser.advance();
                defaultValue = parser.parseExpression();
            }
        } else if (parser.current.type === parser.TokenType.IDENTIFIER) {
            const paramName = parser.current.value;
            parser.advance();
            if (parser.current.type === parser.TokenType.COLON) {
                parser.advance();
                varType = parser.parseTypeAnnotation();
            }
            if (parser.current.type === parser.TokenType.ASSIGNMENT && parser.current.value === '=') {
                parser.advance();
                defaultValue = parser.parseExpression();
            }
            param = paramName;
        } else {
            parser.advance();
            continue;
        }
        params.push({ name: param, varType, defaultValue, isRest });
        if (parser.current.type === parser.TokenType.COMMA) {
            parser.advance();
        } else if (parser.current.type !== parser.TokenType.RIGHT_PAREN) {
            break;
        }
    }
    parser.expect(parser.TokenType.RIGHT_PAREN);
    return params;
}

module.exports = _parseFunctionParams;
