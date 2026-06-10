const { DO_WHILE_STATEMENT, BLOCK_STATEMENT } = require('../../../utils/ast-node-types');

function parseDoWhileStatement(parser) {
    parser.expect(parser.TokenType.KEYWORD, 'do');
    let body = null;
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        body = parser.parseBlockStatement();
    } else {
        if (parser.current.type !== parser.TokenType.EOF) parser.advance();
        body = { type: BLOCK_STATEMENT, body: [] };
    }
    parser.expect(parser.TokenType.KEYWORD, 'while');
    parser.expect(parser.TokenType.LEFT_PAREN);
    let test = parser.parseExpression();
    parser.expect(parser.TokenType.RIGHT_PAREN);
    if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
    return {
        type: DO_WHILE_STATEMENT,
        body,
        test
    };
}

module.exports = parseDoWhileStatement;
