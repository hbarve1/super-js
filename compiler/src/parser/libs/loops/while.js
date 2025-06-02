const { WHILE_STATEMENT, BLOCK_STATEMENT } = require('../../../utils/ast-node-types');

function parseWhileStatement(parser) {
    parser.expect(parser.TokenType.KEYWORD, 'while');
    parser.expect(parser.TokenType.LEFT_PAREN);
    let test = parser.parseExpression();
    parser.expect(parser.TokenType.RIGHT_PAREN);
    let body = null;
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        body = parser.parseBlockStatement();
    } else {
        if (parser.current.type !== parser.TokenType.EOF) parser.advance();
        body = { type: BLOCK_STATEMENT, body: [] };
    }
    return {
        type: WHILE_STATEMENT,
        test,
        body
    };
}

module.exports = parseWhileStatement;
