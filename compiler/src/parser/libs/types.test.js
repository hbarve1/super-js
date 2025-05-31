const Lexer = require('../../lexer/lexer');
const Parser = require('../parser');

describe('Parser - Type Annotations', () => {
    test('parses union type annotation', () => {
        const code = 'let x: string | number = 5;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].varType).toEqual({
            type: 'UnionType',
            left: { type: 'TypeIdentifier', name: 'string' },
            right: { type: 'TypeIdentifier', name: 'number' }
        });
    });
    test('parses intersection type annotation', () => {
        const code = 'let y: A & B = foo;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].varType).toEqual({
            type: 'IntersectionType',
            left: { type: 'TypeIdentifier', name: 'A' },
            right: { type: 'TypeIdentifier', name: 'B' }
        });
    });
    test('parses generic type annotation', () => {
        const code = 'let z: Array<number> = [1, 2, 3];';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].varType).toEqual({
            type: 'GenericType',
            name: 'Array',
            typeParams: [ { type: 'TypeIdentifier', name: 'number' } ]
        });
    });
    test('parses function parameter and return type with generics and unions', () => {
        const code = 'function f<T>(x: T | number): Array<T> { return [x]; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const fn = ast.body[0];
        expect(fn.params[0].varType).toEqual({
            type: 'UnionType',
            left: { type: 'TypeIdentifier', name: 'T' },
            right: { type: 'TypeIdentifier', name: 'number' }
        });
        expect(fn.returnType).toEqual({
            type: 'GenericType',
            name: 'Array',
            typeParams: [ { type: 'TypeIdentifier', name: 'T' } ]
        });
    });
}); 