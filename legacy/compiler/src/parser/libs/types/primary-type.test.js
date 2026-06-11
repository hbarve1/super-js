const Lexer = require('../../../lexer/lexer');
const Parser = require('../../parser');
const { parsePrimaryType } = require('./primary-type');

describe('parsePrimaryType (unit)', () => {
    function getParserForType(typeSrc) {
        const code = `let x: ${typeSrc} = 1;`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        return new Parser(tokens);
    }

    test('parses tuple type', () => {
        const parser = getParserForType('[number, string]');
        parser.expect(parser.TokenType.KEYWORD, 'let');
        parser.expect(parser.TokenType.IDENTIFIER, 'x');
        parser.expect(parser.TokenType.COLON);
        const tuple = parsePrimaryType(parser);
        expect(tuple.type).toBe('TupleType');
        expect(tuple.elementTypes.length).toBe(2);
    });

    test('parses object type', () => {
        const parser = getParserForType('{ a: number, b?: string }');
        parser.expect(parser.TokenType.KEYWORD, 'let');
        parser.expect(parser.TokenType.IDENTIFIER, 'x');
        parser.expect(parser.TokenType.COLON);
        const obj = parsePrimaryType(parser);
        expect(obj.type).toBe('ObjectType');
        expect(obj.properties.length).toBe(2);
        expect(obj.properties[1].optional).toBe(true);
    });

    test('parses generic type', () => {
        const parser = getParserForType('Array<number>');
        parser.expect(parser.TokenType.KEYWORD, 'let');
        parser.expect(parser.TokenType.IDENTIFIER, 'x');
        parser.expect(parser.TokenType.COLON);
        const gen = parsePrimaryType(parser);
        expect(gen.type).toBe('GenericType');
        expect(gen.name).toBe('Array');
        expect(gen.typeParams[0].type).toBe('TypeIdentifier');
    });

    test('parses type identifier', () => {
        const parser = getParserForType('Foo');
        parser.expect(parser.TokenType.KEYWORD, 'let');
        parser.expect(parser.TokenType.IDENTIFIER, 'x');
        parser.expect(parser.TokenType.COLON);
        const id = parsePrimaryType(parser);
        expect(id.type).toBe('TypeIdentifier');
        expect(id.name).toBe('Foo');
    });

    test('parses parenthesized type', () => {
        const parser = getParserForType('(number)');
        parser.expect(parser.TokenType.KEYWORD, 'let');
        parser.expect(parser.TokenType.IDENTIFIER, 'x');
        parser.expect(parser.TokenType.COLON);
        const paren = parsePrimaryType(parser);
        expect(paren.type).toBe('TypeIdentifier');
        expect(paren.name).toBe('number');
    });

    test('parses fallback to any', () => {
        const parser = getParserForType('');
        parser.expect(parser.TokenType.KEYWORD, 'let');
        parser.expect(parser.TokenType.IDENTIFIER, 'x');
        parser.expect(parser.TokenType.COLON);
        const anyType = parsePrimaryType(parser);
        expect(anyType.type).toBe('TypeIdentifier');
        expect(anyType.name).toBe('any');
    });
});
