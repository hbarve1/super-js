const { VARIABLE_DECLARATION } = require('../../../utils/ast-node-types');
const { parseVariableDeclarator } = require('./parse-variable-declarator');
const { validateVariableKind } = require('./validate-variable-kind');
const { recoverInvalidDeclarator, recoverInvalidInit } = require('./error-recovery');

function parseVariableDeclaration(parser, inForLoop = false) {
    const kindToken = validateVariableKind(parser);
    parser.advance();
    const declarations = [];
    let first = true;
    while (true) {
        const { idNode, varType, invalidDeclarator } = parseVariableDeclarator(parser);
        let init = null;
        let isInvalid = invalidDeclarator;
        if (!isInvalid && parser.current.type === parser.TokenType.ASSIGNMENT) {
            parser.advance();
            try {
                init = parser.parseExpression();
            } catch (e) {
                init = recoverInvalidInit(e);
                while (
                    parser.current.type !== parser.TokenType.COMMA &&
                    parser.current.type !== parser.TokenType.SEMICOLON &&
                    parser.current.type !== parser.TokenType.EOF
                ) {
                    parser.advance();
                }
            }
        }
        if (!isInvalid && kindToken.value === 'const' && init == null) {
            isInvalid = true;
        }
        if (!isInvalid) {
            declarations.push({
                type: VARIABLE_DECLARATION,
                kind: kindToken.value,
                id: idNode,
                varType: varType === undefined ? null : varType,
                init
            });
        } else if (first) {
            declarations.push(recoverInvalidDeclarator(kindToken, idNode));
            break;
        }
        first = false;
        if (parser.current.type === parser.TokenType.SEMICOLON) {
            parser.advance();
            return declarations.length === 1 ? declarations[0] : declarations;
        }
        if (parser.current.type === parser.TokenType.COMMA) {
            parser.advance();
            continue;
        } else {
            if (inForLoop && (parser.current.type === parser.TokenType.RIGHT_PAREN || parser.current.type === parser.TokenType.SEMICOLON)) {
                return declarations.length === 1 ? declarations[0] : declarations;
            }
            break;
        }
    }
    if (inForLoop && declarations.length > 0) {
        return declarations.length === 1 ? declarations[0] : declarations;
    }
    return null;
}

module.exports = { parseVariableDeclaration };
