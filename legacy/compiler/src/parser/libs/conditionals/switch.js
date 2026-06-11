const { SWITCH_STATEMENT } = require('../../../utils/ast-node-types');

function parseSwitchStatement(parser) {
    parser.expect(parser.TokenType.KEYWORD, 'switch');
    parser.expect(parser.TokenType.LEFT_PAREN);
    let discriminant = parser.parseExpression();
    parser.expect(parser.TokenType.RIGHT_PAREN);
    const cases = [];
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        parser.advance();
        while (parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF) {
            if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'case') {
                parser.advance();
                const test = parser.parseExpression();
                parser.expect(parser.TokenType.COLON);
                const consequent = [];
                while (
                    (parser.current.type !== parser.TokenType.KEYWORD || (parser.current.value !== 'case' && parser.current.value !== 'default')) &&
                    parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF
                ) {
                    const stmt = parser.parseStatement();
                    if (stmt) consequent.push(stmt);
                }
                cases.push({ type: 'SwitchCase', test, consequent });
            } else if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'default') {
                parser.advance();
                parser.expect(parser.TokenType.COLON);
                const consequent = [];
                while (
                    (parser.current.type !== parser.TokenType.KEYWORD || (parser.current.value !== 'case' && parser.current.value !== 'default')) &&
                    parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF
                ) {
                    const stmt = parser.parseStatement();
                    if (stmt) consequent.push(stmt);
                }
                cases.push({ type: 'SwitchCase', test: null, consequent });
            } else {
                parser.advance();
            }
        }
        parser.expect(parser.TokenType.RIGHT_BRACE);
    }
    return {
        type: SWITCH_STATEMENT,
        discriminant,
        cases
    };
}

module.exports = parseSwitchStatement;
