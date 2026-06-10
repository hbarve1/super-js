// Type declaration parsing helper for Parser

const {
  TYPE_DECLARATION,
  INTERFACE_DECLARATION,
  ENUM_DECLARATION,
  NAMESPACE_DECLARATION,
  UNION_TYPE,
  INTERSECTION_TYPE,
  GENERIC_TYPE,
  ARRAY_TYPE,
  OBJECT_TYPE,
  TYPE_IDENTIFIER
} = require('../../../utils/ast-node-types');

const parseTypeAnnotation = require('./primary-type').parseTypeAnnotation;

function parseTypeDeclaration(parser) {
    // type|interface|enum|namespace NAME ...
    const kind = parser.current.value;
    parser.advance();
    const idToken = parser.expect(parser.TokenType.IDENTIFIER);
    // For now, just skip to the next block or semicolon and stub the body
    let body = [];
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        // Skip block
        parser.advance();
        let braceDepth = 1;
        while (braceDepth > 0 && parser.current.type !== parser.TokenType.EOF) {
            if (parser.current.type === parser.TokenType.LEFT_BRACE) braceDepth++;
            if (parser.current.type === parser.TokenType.RIGHT_BRACE) braceDepth--;
            parser.advance();
        }
    } else {
        // Skip until semicolon
        while (parser.current.type !== parser.TokenType.SEMICOLON && parser.current.type !== parser.TokenType.EOF) {
            parser.advance();
        }
        if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
    }
    let nodeType = TYPE_DECLARATION;
    if (kind === 'interface') nodeType = INTERFACE_DECLARATION;
    if (kind === 'enum') nodeType = ENUM_DECLARATION;
    if (kind === 'namespace') nodeType = NAMESPACE_DECLARATION;
    return {
        type: nodeType,
        kind,
        id: idToken.value,
        body
    };
}

function parsePrimaryType(parser) {
    // Tuple type: [T, U, ...]
    if (parser.current.type === parser.TokenType.LEFT_BRACKET) {
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
    // Object type literal: { p: number, q?: string }
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
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
                // Skip unexpected tokens
                parser.advance();
            }
        }
        parser.expect(parser.TokenType.RIGHT_BRACE);
        return { type: OBJECT_TYPE, properties };
    }
    // Parse a single type: identifier, generic, object, or parenthesized type
    if (parser.current.type === parser.TokenType.IDENTIFIER || parser.current.type === parser.TokenType.KEYWORD) {
        const name = parser.current.value;
        parser.advance();
        // Generic type: Foo<Bar>
        if (parser.current.type === parser.TokenType.LEFT_ANGLE) {
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
        return { type: TYPE_IDENTIFIER, name };
    }
    // Parenthesized type
    if (parser.current.type === parser.TokenType.LEFT_PAREN) {
        parser.advance();
        const type = parseTypeAnnotation(parser);
        parser.expect(parser.TokenType.RIGHT_PAREN);
        return type;
    }
    // Array type: T[]
    if (parser.current.type === parser.TokenType.LEFT_BRACKET) {
        parser.advance();
        parser.expect(parser.TokenType.RIGHT_BRACKET);
        return { type: ARRAY_TYPE, elementType: { type: TYPE_IDENTIFIER, name: 'any' } };
    }
    // Fallback
    return { type: TYPE_IDENTIFIER, name: 'any' };
}

module.exports = {
    parseTypeDeclaration,
    parseTypeAnnotation,
    parsePrimaryType
};