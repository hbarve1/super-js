const Lexer = require('../../../lexer/lexer');
const Parser = require('../../parser');
const { CLASS_DECLARATION, CLASS_PROPERTY, METHOD_DEFINITION } = require('../../../utils/ast-node-types');

describe('Parser - Class Declarations (Enterprise Grade)', () => {
    test('parses simple class with no members', () => {
        const code = 'class Foo {}';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls).toEqual({
            type: CLASS_DECLARATION,
            id: 'Foo',
            superClass: null,
            body: []
        });
    });

    test('parses class with properties and type annotations', () => {
        const code = 'class Point { x: number; y: number; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.body).toEqual([
            { type: CLASS_PROPERTY, key: 'x', varType: { type: 'TypeIdentifier', name: 'number' } },
            { type: CLASS_PROPERTY, key: 'y', varType: { type: 'TypeIdentifier', name: 'number' } }
        ]);
    });

    test('parses class with constructor and methods', () => {
        const code = `class Point {\n  x: number;\n  y: number;\n  constructor(x: number, y: number) { this.x = x; this.y = y; }\n  move(dx: number, dy: number): void { this.x += dx; this.y += dy; }\n}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.body).toEqual([
            { type: CLASS_PROPERTY, key: 'x', varType: { type: 'TypeIdentifier', name: 'number' } },
            { type: CLASS_PROPERTY, key: 'y', varType: { type: 'TypeIdentifier', name: 'number' } },
            expect.objectContaining({
                type: METHOD_DEFINITION,
                key: 'constructor',
                params: [
                    expect.objectContaining({ name: 'x', varType: { type: 'TypeIdentifier', name: 'number' } }),
                    expect.objectContaining({ name: 'y', varType: { type: 'TypeIdentifier', name: 'number' } })
                ],
                returnType: null,
                body: expect.objectContaining({ type: 'BlockStatement', body: expect.any(Array) })
            }),
            expect.objectContaining({
                type: METHOD_DEFINITION,
                key: 'move',
                params: [
                    expect.objectContaining({ name: 'dx', varType: { type: 'TypeIdentifier', name: 'number' } }),
                    expect.objectContaining({ name: 'dy', varType: { type: 'TypeIdentifier', name: 'number' } })
                ],
                returnType: 'void',
                body: expect.objectContaining({ type: 'BlockStatement', body: expect.any(Array) })
            })
        ]);
    });

    test('parses class with extends and implements', () => {
        const code = 'class Bar extends Foo implements IFoo, IBar {}';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.type).toBe(CLASS_DECLARATION);
        expect(cls.id).toBe('Bar');
        expect(cls.superClass).toBe('Foo');
        // Implements is skipped for now, but parser should not throw
        expect(Array.isArray(cls.body)).toBe(true);
    });

    test.skip('parses class with method overloads and generics', () => {
        const code = `class Stack<T> {\n  push(item: T): void;\n  push(item: T[]): void;\n  push(item: any): void { /* impl */ }\n}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.id).toBe('Stack');
        // Should parse all method signatures and implementation
        expect(cls.body.some(m => m.key === 'push')).toBe(true);
    });

    test.skip('recovers from malformed class and continues parsing', () => {
        const code = 'class Bad { x: number; method( { let y = 2; } class Good {}';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should skip the malformed class and parse the next
        expect(ast.body.some(n => n.type === CLASS_DECLARATION && n.id === 'Good')).toBe(true);
    });

    test.skip('parses class with static properties and methods', () => {
        const code = 'class Util { static version: string; static getVersion(): string { return this.version; } }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.body.some(m => m.key === 'version' && m.static === true)).toBe(true);
        expect(cls.body.some(m => m.key === 'getVersion' && m.static === true)).toBe(true);
    });

    test.skip('parses class with access modifiers (public/private/protected)', () => {
        const code = 'class User { public id: number; private name: string; protected email: string; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.body.some(p => p.key === 'id' && p.access === 'public')).toBe(true);
        expect(cls.body.some(p => p.key === 'name' && p.access === 'private')).toBe(true);
        expect(cls.body.some(p => p.key === 'email' && p.access === 'protected')).toBe(true);
    });

    test.skip('parses abstract class and abstract methods', () => {
        const code = 'abstract class Shape { abstract area(): number; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.abstract).toBe(true);
        expect(cls.body.some(m => m.key === 'area' && m.abstract === true)).toBe(true);
    });

    test.skip('parses class with getters and setters', () => {
        const code = 'class Counter { get value(): number { return this._v; } set value(v: number) { this._v = v; } }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.body.some(m => m.key === 'value' && m.kind === 'get')).toBe(true);
        expect(cls.body.some(m => m.key === 'value' && m.kind === 'set')).toBe(true);
    });

    test.skip('parses class fields with initializers', () => {
        const code = 'class Config { debug: boolean = true; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.body.some(p => p.key === 'debug' && p.varType.name === 'boolean' && p.init && p.init.value === true)).toBe(true);
    });

    test('parses multiple classes in one file', () => {
        const code = 'class A {} class B {}';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.filter(n => n.type === CLASS_DECLARATION).length).toBe(2);
    });

    test('parses nested classes', () => {
        const code = 'class Outer { Inner = class InnerClass {}; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.body.some(p => p.key === 'Inner')).toBe(true);
    });

    test.skip('parses class with computed property names', () => {
        const code = 'class Dynamic { ["foo"]() { return 1; } }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.body.some(m => m.computed === true && m.key === 'foo')).toBe(true);
    });

    test.skip('parses class with decorators', () => {
        const code = '@sealed class Decorated {}';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.decorators && cls.decorators.some(d => d.name === 'sealed')).toBe(true);
    });

    test('parses multi-level inheritance', () => {
        const code = 'class A {} class B extends A {} class C extends B {}';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const classes = ast.body.filter(n => n.type === CLASS_DECLARATION);
        expect(classes[1].superClass).toBe('A');
        expect(classes[2].superClass).toBe('B');
    });

    test('parses class with only comments in body', () => {
        const code = 'class Empty { /* nothing here */ }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.body.length).toBe(0);
    });

    test('parses class with only methods', () => {
        const code = 'class OnlyMethods { foo() {} bar() {} }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.body.every(m => m.type === METHOD_DEFINITION)).toBe(true);
    });

    test('parses class with only properties', () => {
        const code = 'class OnlyProps { a: number; b: string; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.body.every(p => p.type === CLASS_PROPERTY)).toBe(true);
    });

    test.skip('recovers from malformed class with missing brace', () => {
        const code = 'class Broken { x: number; method('; // missing closing brace
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should not throw and should parse at least one class
        expect(ast.body.some(n => n.type === CLASS_DECLARATION)).toBe(true);
    });

    test('recovers from malformed class with only keyword', () => {
        const code = 'class';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should not throw and should skip the invalid class
        expect(ast.body.every(n => n.type !== CLASS_DECLARATION || n.id)).toBe(true);
    });
});
