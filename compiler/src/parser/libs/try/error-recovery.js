// Helpers for error handling and recovery in try/catch/finally parsing
function recoverMalformedTry(parser) {
    // Skip tokens until we find a block or EOF
    while (parser.current.type !== parser.TokenType.LEFT_BRACE && parser.current.type !== parser.TokenType.EOF) {
        parser.advance();
    }
    return { type: 'TryStatement', block: { type: 'BlockStatement', body: [] }, handler: null, finalizer: null, error: 'Malformed try statement' };
}

module.exports = { recoverMalformedTry };
