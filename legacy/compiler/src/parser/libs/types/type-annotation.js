const { ARRAY_TYPE, UNION_TYPE, INTERSECTION_TYPE } = require('../../../utils/ast-node-types');
const parsePrimaryType = require('./primary-type').parsePrimaryType;
const parseTypeAnnotation = require('./primary-type').parseTypeAnnotation;

function parseTypeAnnotation(parser) {
    let type = parsePrimaryType(parser);
    while (parser.current.type === parser.TokenType.LEFT_BRACKET && parser.peek().type === parser.TokenType.RIGHT_BRACKET) {
        parser.advance();
        parser.advance();
        type = { type: ARRAY_TYPE, elementType: type };
    }
    while (parser.current.type === parser.TokenType.UNION || parser.current.type === parser.TokenType.INTERSECTION) {
        const operator = parser.current.type === parser.TokenType.UNION ? '|' : '&';
        parser.advance();
        const right = parsePrimaryType(parser);
        type = {
            type: operator === '|' ? UNION_TYPE : INTERSECTION_TYPE,
            left: type,
            right
        };
    }
    return type;
}

module.exports = parseTypeAnnotation;
