// Error recovery for malformed if/else
function recoverMalformedIf(parser) {
    // Skip tokens until we find a block or EOF
    while (parser.current.type !== parser.TokenType.LEFT_BRACE && parser.current.type !== parser.TokenType.EOF) {
        parser.advance();
    }
    return { type: 'IfStatement', test: null, consequent: { type: 'BlockStatement', body: [] }, alternate: null, error: 'Malformed if statement' };
}

module.exports = { recoverMalformedIf };
