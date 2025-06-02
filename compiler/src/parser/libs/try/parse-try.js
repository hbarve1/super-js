const { TRY_STATEMENT } = require('../../../utils/ast-node-types');
const { parseCatchClause } = require('./parse-catch');
const { parseFinallyClause } = require('./parse-finally');
const { recoverMalformedTry } = require('./error-recovery');

function parseTryStatement(parser) {
    try {
        parser.expect(parser.TokenType.KEYWORD, 'try');
        let block = null;
        if (parser.current.type === parser.TokenType.LEFT_BRACE) {
            block = parser.parseBlockStatement();
        } else {
            block = { type: 'BlockStatement', body: [] };
        }
        const handler = parseCatchClause(parser);
        const finalizer = parseFinallyClause(parser);
        return {
            type: TRY_STATEMENT,
            block,
            handler,
            finalizer
        };
    } catch (e) {
        return recoverMalformedTry(parser);
    }
}

module.exports = parseTryStatement;
