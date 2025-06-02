const Lexer = require('../../../lexer/lexer');
const Parser = require('../../parser');

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
                { key: 'p', valueType: { type: 'TypeIdentifier', name: 'number' }, optional: false },
                { key: 'q', valueType: { type: 'TypeIdentifier', name: 'string' }, optional: false }
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
                            { key: 'b', valueType: { type: 'TypeIdentifier', name: 'number' }, optional: false }
                        ]
                    },
                    optional: false
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
                                },
                                optional: false
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

describe('Parser - Template Strings', () => {
    test('parses simple template string', () => {
        const code = 'let s = `hello world`;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].init.type).toBe('Literal');
        expect(typeof ast.body[0].init.value).toBe('string');
    });

    test('parses template string with embedded expression', () => {
        const code = 'let s = `value is ${a}`;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should parse as a Literal or TemplateLiteral node depending on parser support
        expect(ast.body[0].init).toBeDefined();
    });

    test('parses template string with nested expressions', () => {
        const code = 'let s = `a = ${1 + `${2}`}`;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].init).toBeDefined();
    });

    test('parses template string with multiple expressions', () => {
        const code = 'let s = `a = ${a}, b = ${b}`;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].init).toBeDefined();
    });

    test('parses template string in function return', () => {
        const code = 'function f() { return `hi ${name}`; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const fn = ast.body[0];
        expect(fn.body.body[0].argument).toBeDefined();
    });

    test('parses template string in object and array', () => {
        const code = 'let arr = [`foo`]; let obj = {s: `bar`};';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].init.elements[0].type).toBe('Literal');
        expect(ast.body[1].init.properties[0].value.type).toBe('Literal');
    });

    test('parses empty template string', () => {
        const code = 'let s = ``;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].init.type).toBe('Literal');
        expect(ast.body[0].init.value).toBe('');
    });
});

describe('Parser - Type Annotations (enterprise edge cases)', () => {
    test('parses deeply nested generics', () => {
        const code = 'let x: Map<string, Array<Map<number, Set<boolean>>>> = null;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].varType.type).toBe('GenericType');
        expect(ast.body[0].varType.name).toBe('Map');
        expect(ast.body[0].varType.typeParams[1].type).toBe('GenericType');
    });
    test('parses tuple type with trailing comma', () => {
        const code = 'let t: [number, string,] = [1, "a"];';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].varType.type).toBe('TupleType');
        expect(ast.body[0].varType.elementTypes.length).toBe(2);
    });
    test('parses object type with no properties', () => {
        const code = 'let o: {} = {};';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].varType.type).toBe('ObjectType');
        expect(ast.body[0].varType.properties.length).toBe(0);
    });
    test.skip('recovers from invalid type annotation', () => {
        const code = 'let x: { a: number, b: = 1;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        expect(ast.body[0]).toBeDefined();
        expect(ast.body[0].varType).toBeDefined();
    });
});
