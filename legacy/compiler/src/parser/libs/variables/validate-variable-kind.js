// Checks for let, const, var and throws if not found
function validateVariableKind(parser) {
    if (
        parser.current.type !== parser.TokenType.KEYWORD ||
        !['let', 'const', 'var'].includes(parser.current.value)
    ) {
        throw new Error('Expected variable declaration keyword');
    }
    return parser.current;
}

module.exports = { validateVariableKind };
