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
    test('parses array type annotation', () => {
        const code = 'let arr: number[] = [1, 2, 3];';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].varType).toEqual({
            type: 'ArrayType',
            elementType: { type: 'TypeIdentifier', name: 'number' }
        });
    });
    test('parses nested array and generic type annotation', () => {
        const code = 'let arr: Array<Array<string>> = [["a"]];';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].varType).toEqual({
            type: 'GenericType',
            name: 'Array',
            typeParams: [
                {
                    type: 'GenericType',
                    name: 'Array',
                    typeParams: [ { type: 'TypeIdentifier', name: 'string' } ]
                }
            ]
        });
    });
    test('parses object type annotation', () => {
        const code = 'let obj: { p: number, q: string } = { p: 1, q: "a" };';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].varType).toEqual({
            type: 'ObjectType',
            properties: [
                { key: 'p', valueType: { type: 'TypeIdentifier', name: 'number' } },
                { key: 'q', valueType: { type: 'TypeIdentifier', name: 'string' } }
            ]
        });
    });
    test('parses nested object type annotation', () => {
        const code = 'let obj: { a: { b: number } } = { a: { b: 1 } };';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].varType).toEqual({
            type: 'ObjectType',
            properties: [
                {
                    key: 'a',
                    valueType: {
                        type: 'ObjectType',
                        properties: [
                            { key: 'b', valueType: { type: 'TypeIdentifier', name: 'number' } }
                        ]
                    }
                }
            ]
        });
    });
    test('parses parenthesized type annotation', () => {
        const code = 'let x: (number) = 5;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].varType).toEqual({ type: 'TypeIdentifier', name: 'number' });
    });
    test('parses deeply nested type annotation', () => {
        const code = 'let x: Array<{ a: number[] | string } & B> = [];' ;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].varType).toEqual({
            type: 'GenericType',
            name: 'Array',
            typeParams: [
                {
                    type: 'IntersectionType',
                    left: {
                        type: 'ObjectType',
                        properties: [
                            {
                                key: 'a',
                                valueType: {
                                    type: 'UnionType',
                                    left: {
                                        type: 'ArrayType',
                                        elementType: { type: 'TypeIdentifier', name: 'number' }
                                    },
                                    right: { type: 'TypeIdentifier', name: 'string' }
                                }
                            }
                        ]
                    },
                    right: { type: 'TypeIdentifier', name: 'B' }
                }
            ]
        });
    });
    test('parses type alias declaration', () => {
        const code = 'type Foo = number;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const typeDecl = ast.body.find(n => n.type === 'TypeDeclaration' && n.kind === 'type');
        expect(typeDecl).toBeDefined();
        expect(typeDecl.id).toBe('Foo');
    });
    test('parses interface declaration', () => {
        const code = 'interface Bar { x: number; y: string; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const iface = ast.body.find(n => n.type === 'InterfaceDeclaration' && n.kind === 'interface');
        expect(iface).toBeDefined();
        expect(iface.id).toBe('Bar');
    });
    test('parses enum declaration', () => {
        const code = 'enum Color { Red, Green, Blue }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const en = ast.body.find(n => n.type === 'EnumDeclaration' && n.kind === 'enum');
        expect(en).toBeDefined();
        expect(en.id).toBe('Color');
    });
    test('parses namespace declaration', () => {
        const code = 'namespace NS { export const z = 1; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const ns = ast.body.find(n => n.type === 'NamespaceDeclaration' && n.kind === 'namespace');
        expect(ns).toBeDefined();
        expect(ns.id).toBe('NS');
    });
});
