const { FUNCTION_DECLARATION } = require('../../../utils/ast-node-types');
const _parseGenerics = require('./generics');
const _parseFunctionParams = require('./function-params');

function parseFunctionDeclaration(parser) {
    let isAsync = false;
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'async') {
        isAsync = true;
        parser.advance();
    }
    parser.expect(parser.TokenType.KEYWORD, 'function');
    let isGenerator = false;
    if (parser.current.type === parser.TokenType.OPERATOR && parser.current.value === '*') {
        isGenerator = true;
        parser.advance();
    }
    const idToken = parser.expect(parser.TokenType.IDENTIFIER);
    const generics = _parseGenerics(parser);
    const params = _parseFunctionParams(parser);
    let returnType = null;
    if (parser.current.type === parser.TokenType.COLON) {
        parser.advance();
        returnType = parser.parseTypeAnnotation();
    }
    const body = parser.parseBlockStatement();
    return {
        type: FUNCTION_DECLARATION,
        id: idToken.value,
        params,
        returnType,
        isGenerator,
        isAsync,
        generics,
        body
    };
}

module.exports = parseFunctionDeclaration;
