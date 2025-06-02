const { BLOCK_STATEMENT } = require('../../../utils/ast-node-types');

function parseBlockStatement(parser) {
    parser.expect(parser.TokenType.LEFT_BRACE);
    const body = [];
    while (parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF) {
        try {
            const stmt = parser.parseStatement();
            if (stmt) body.push(stmt);
        } catch (e) {
            body.push({ type: 'ExpressionStatement', skipped: true, error: e.message });
            while (
                parser.current.type !== parser.TokenType.SEMICOLON &&
                parser.current.type !== parser.TokenType.RIGHT_BRACE &&
                parser.current.type !== parser.TokenType.EOF
            ) {
                parser.advance();
            }
            if (parser.current.type === parser.TokenType.SEMICOLON) {
                parser.advance();
            }
            console.log('AFTER ERROR RECOVERY:', parser.current);
        }
    }
    parser.expect(parser.TokenType.RIGHT_BRACE);
    return { type: BLOCK_STATEMENT, body };
}

module.exports = parseBlockStatement;
