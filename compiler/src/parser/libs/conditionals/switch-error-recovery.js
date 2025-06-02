// Error recovery for malformed switch
function recoverMalformedSwitch(parser) {
    // Skip tokens until we find a block or EOF
    while (parser.current.type !== parser.TokenType.LEFT_BRACE && parser.current.type !== parser.TokenType.EOF) {
        parser.advance();
    }
    return { type: 'SwitchStatement', discriminant: null, cases: [], error: 'Malformed switch statement' };
}

module.exports = { recoverMalformedSwitch };
