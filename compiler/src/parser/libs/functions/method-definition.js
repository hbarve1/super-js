const { METHOD_DEFINITION } = require('../../../utils/ast-node-types');
const _parseFunctionParams = require('./function-params');

function parseMethodDefinition(parser, key) {
    const params = _parseFunctionParams(parser);
    let returnType = null;
    if (parser.current.type === parser.TokenType.COLON) {
        parser.advance();
        if (parser.current.type === parser.TokenType.KEYWORD || parser.current.type === parser.TokenType.IDENTIFIER) {
            returnType = parser.current.value;
            parser.advance();
        }
    }
    const body = parser.parseBlockStatement();
    return {
        type: METHOD_DEFINITION,
        key,
        params,
        returnType,
        body
    };
}

module.exports = parseMethodDefinition;
