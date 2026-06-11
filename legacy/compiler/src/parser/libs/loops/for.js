const { FOR_STATEMENT, BLOCK_STATEMENT } = require('../../../utils/ast-node-types');

function parseForStatement(parser) {
    parser.expect(parser.TokenType.KEYWORD, 'for');
    parser.expect(parser.TokenType.LEFT_PAREN);
    let init = null;
    if (parser.current.type === parser.TokenType.KEYWORD && ['let', 'const', 'var'].includes(parser.current.value)) {
        try {
            init = parser.parseVariableDeclaration(true);
        } catch (e) {
            init = null;
            while (parser.current.type !== parser.TokenType.SEMICOLON && parser.current.type !== parser.TokenType.RIGHT_PAREN && parser.current.type !== parser.TokenType.EOF) {
                parser.advance();
            }
        }
    } else if (parser.current.type !== parser.TokenType.SEMICOLON) {
        init = parser.parseExpression();
        if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
    } else {
        parser.advance();
    }
    let test = null;
    if (parser.current.type !== parser.TokenType.SEMICOLON) {
        test = parser.parseExpression();
    }
    parser.expect(parser.TokenType.SEMICOLON);
    let update = null;
    if (parser.current.type !== parser.TokenType.RIGHT_PAREN) {
        update = parser.parseExpression();
    }
    parser.expect(parser.TokenType.RIGHT_PAREN);
    let body = null;
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        body = parser.parseBlockStatement();
    } else {
        if (parser.current.type !== parser.TokenType.EOF) parser.advance();
        body = { type: BLOCK_STATEMENT, body: [] };
    }
    return {
        type: FOR_STATEMENT,
        init,
        test,
        update,
        body
    };
}

module.exports = parseForStatement;
