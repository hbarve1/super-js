// Handles parsing the finally clause for try statements
function parseFinallyClause(parser) {
    let finalizer = null;
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'finally') {
        parser.advance();
        let finallyBlock = null;
        if (parser.current.type === parser.TokenType.LEFT_BRACE) {
            finallyBlock = parser.parseBlockStatement();
        } else {
            finallyBlock = { type: 'BlockStatement', body: [] };
        }
        finalizer = finallyBlock;
    }
    return finalizer;
}

module.exports = { parseFinallyClause };
