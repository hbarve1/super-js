const {
  ARRAY_TYPE, OBJECT_TYPE, GENERIC_TYPE, TYPE_IDENTIFIER, UNION_TYPE, INTERSECTION_TYPE
} = require('../../../utils/ast-node-types');

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

function parseTupleType(parser) {
    parser.advance();
    const elementTypes = [];
    while (parser.current.type !== parser.TokenType.RIGHT_BRACKET && parser.current.type !== parser.TokenType.EOF) {
        elementTypes.push(parseTypeAnnotation(parser));
        if (parser.current.type === parser.TokenType.COMMA) {
            parser.advance();
        } else {
            break;
        }
    }
    parser.expect(parser.TokenType.RIGHT_BRACKET);
    return { type: 'TupleType', elementTypes };
}

function parseObjectType(parser) {
    parser.advance();
    const properties = [];
    while (parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF) {
        if (parser.current.type === parser.TokenType.IDENTIFIER) {
            const key = parser.current.value;
            parser.advance();
            let optional = false;
            if (parser.current.type === parser.TokenType.QUESTION_MARK) {
                optional = true;
                parser.advance();
            }
            parser.expect(parser.TokenType.COLON);
            const valueType = parseTypeAnnotation(parser);
            properties.push({ key, valueType, optional });
            if (parser.current.type === parser.TokenType.COMMA) {
                parser.advance();
            } else if (parser.current.type !== parser.TokenType.RIGHT_BRACE) {
                break;
            }
        } else {
            parser.advance();
        }
    }
    parser.expect(parser.TokenType.RIGHT_BRACE);
    return { type: OBJECT_TYPE, properties };
}

function parseGenericType(parser, name) {
    parser.advance();
    const typeParams = [];
    while (parser.current.type !== parser.TokenType.RIGHT_ANGLE && parser.current.type !== parser.TokenType.EOF) {
        typeParams.push(parseTypeAnnotation(parser));
        if (parser.current.type === parser.TokenType.COMMA) {
            parser.advance();
        } else {
            break;
        }
    }
    parser.expect(parser.TokenType.RIGHT_ANGLE);
    return {
        type: GENERIC_TYPE,
        name,
        typeParams
    };
}

function parseTypeIdentifier(parser) {
    const name = parser.current.value;
    parser.advance();
    if (parser.current.type === parser.TokenType.LEFT_ANGLE) {
        return parseGenericType(parser, name);
    }
    return { type: TYPE_IDENTIFIER, name };
}

function parseParenthesizedType(parser) {
    parser.advance();
    const type = parseTypeAnnotation(parser);
    parser.expect(parser.TokenType.RIGHT_PAREN);
    return type;
}

function parseArrayType(parser) {
    parser.advance();
    parser.expect(parser.TokenType.RIGHT_BRACKET);
    return { type: ARRAY_TYPE, elementType: { type: TYPE_IDENTIFIER, name: 'any' } };
}

function parsePrimaryType(parser) {
    try {
        if (parser.current.type === parser.TokenType.LEFT_BRACKET) {
            return parseTupleType(parser);
        }
        if (parser.current.type === parser.TokenType.LEFT_BRACE) {
            return parseObjectType(parser);
        }
        if (parser.current.type === parser.TokenType.IDENTIFIER || parser.current.type === parser.TokenType.KEYWORD) {
            return parseTypeIdentifier(parser);
        }
        if (parser.current.type === parser.TokenType.LEFT_PAREN) {
            return parseParenthesizedType(parser);
        }
        if (parser.current.type === parser.TokenType.LEFT_BRACKET) {
            return parseArrayType(parser);
        }
        return { type: TYPE_IDENTIFIER, name: 'any' };
    } catch (e) {
        while (
            parser.current.type !== parser.TokenType.COMMA &&
            parser.current.type !== parser.TokenType.RIGHT_BRACE &&
            parser.current.type !== parser.TokenType.EOF
        ) {
            parser.advance();
        }
        return { type: TYPE_IDENTIFIER, name: 'any', error: e.message };
    }
}

module.exports = {
    parseTypeAnnotation,
    parsePrimaryType
};
