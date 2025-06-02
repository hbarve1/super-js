const { IF_STATEMENT, BLOCK_STATEMENT } = require('../../../utils/ast-node-types');

function parseIfStatement(parser) {
    parser.expect(parser.TokenType.KEYWORD, 'if');
    parser.expect(parser.TokenType.LEFT_PAREN);
    let test = parser.parseExpression();
    parser.expect(parser.TokenType.RIGHT_PAREN);
    let consequent = null;
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        consequent = parser.parseBlockStatement();
    } else {
        if (parser.current.type !== parser.TokenType.EOF) parser.advance();
        consequent = { type: BLOCK_STATEMENT, body: [] };
    }
    let alternate = null;
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'else') {
        parser.advance();
        if (parser.current.type === parser.TokenType.LEFT_BRACE) {
            alternate = parser.parseBlockStatement();
        } else {
            if (parser.current.type !== parser.TokenType.EOF) parser.advance();
            alternate = { type: BLOCK_STATEMENT, body: [] };
        }
    }
    return {
        type: IF_STATEMENT,
        test,
        consequent,
        alternate
    };
}

module.exports = parseIfStatement;
