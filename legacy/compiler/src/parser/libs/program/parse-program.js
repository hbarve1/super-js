const { EXPRESSION_STATEMENT, PROGRAM } = require('../../../utils/ast-node-types');

function parseProgram(parser) {
    const body = [];
    while (parser.current.type !== parser.TokenType.EOF) {
        try {
            const stmt = parser.parseStatement();
            if (Array.isArray(stmt)) {
                body.push(...stmt);
            } else if (stmt) {
                body.push(stmt);
            }
        } catch (e) {
            body.push({ type: EXPRESSION_STATEMENT, skipped: true, error: e.message });
            while (
                parser.current.type !== parser.TokenType.SEMICOLON &&
                parser.current.type !== parser.TokenType.RIGHT_BRACE &&
                parser.current.type !== parser.TokenType.EOF
            ) {
                parser.advance();
            }
            if (parser.current.type === parser.TokenType.SEMICOLON || parser.current.type === parser.TokenType.RIGHT_BRACE) {
                parser.advance();
            } else if (parser.current.type !== parser.TokenType.EOF) {
                parser.advance();
            }
        }
    }
    return { type: PROGRAM, body };
}

module.exports = parseProgram;
