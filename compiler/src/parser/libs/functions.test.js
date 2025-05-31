const Lexer = require('../../lexer/lexer');
const Parser = require('../parser');

describe('Parser - Arrow Functions', () => {
    test('parses arrow function with parenthesized params and expression body', () => {
        const code = 'let f = (x, y) => x + y;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].init.type).toBe('ArrowFunctionExpression');
        expect(ast.body[0].init.params.length).toBe(2);
        expect(ast.body[0].init.body.type).toBe('BinaryExpression');
    });
    test('parses arrow function with single param and expression body', () => {
        const code = 'let f = x => x * 2;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].init.type).toBe('ArrowFunctionExpression');
        expect(ast.body[0].init.params.length).toBe(1);
        expect(ast.body[0].init.body.type).toBe('BinaryExpression');
    });
    test('parses arrow function with type annotations and block body', () => {
        const code = 'let f = (x: number, y: number): number => { return x + y; };';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].init.type).toBe('ArrowFunctionExpression');
        expect(ast.body[0].init.params[0].varType).toBe('number');
        expect(ast.body[0].init.returnType).toBe('number');
        expect(ast.body[0].init.body.type).toBe('BlockStatement');
    });
});

describe('Parser - Function Declarations and Expressions', () => {
    test('parses standard function declaration', () => {
        const code = 'function foo(x, y) { return x + y; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const fn = ast.body[0];
        expect(fn.type).toBe('FunctionDeclaration');
        expect(fn.id).toBe('foo');
        expect(fn.params.length).toBe(2);
        expect(fn.body.type).toBe('BlockStatement');
    });
    test('parses function with return type annotation', () => {
        const code = 'function foo(x: number): number { return x; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const fn = ast.body[0];
        expect(fn.returnType).toEqual({ type: 'TypeIdentifier', name: 'number' });
    });
    test('parses async and generator functions', () => {
        const code = 'async function afn() {} function* gen() { yield 1; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // console.log('AST:', JSON.stringify(ast, null, 2));
        expect(ast.body[0].isAsync).toBe(true);
        expect(ast.body[1].isGenerator).toBe(true);
    });
    test('parses function with default and rest params', () => {
        const code = 'function f(x = 1, ...rest) { return rest; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].params.length).toBe(2);
    });
    test('parses function with destructured params', () => {
        const code = 'function f({a, b}: {a: number, b: string}) {}';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].params[0].name.type).toBe('ObjectPattern');
    });
    test('parses nested function declarations', () => {
        const code = 'function outer() { function inner() { return 1; } }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const outer = ast.body[0];
        expect(outer.body.body[0].type).toBe('FunctionDeclaration');
    });
    test('parses function expression (anonymous)', () => {
        const code = 'let f = function(x) { return x; };';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].init.type).toBe('FunctionExpression');
    });
    test('parses function expression (named)', () => {
        const code = 'let f = function foo(x) { return x; };';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].init.type).toBe('FunctionExpression');
        expect(ast.body[0].init.id).toBe('foo');
    });
    test('parses function with generics', () => {
        const code = 'function f<T>(x: T): T { return x; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].generics).toEqual(['T']);
    });
    test('parses function with no params and empty body', () => {
        const code = 'function f() {}';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].params.length).toBe(0);
        expect(ast.body[0].body.body.length).toBe(0);
    });
    test('recovers from malformed function', () => {
        const code = 'function f( { return 1; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should skip the malformed function and continue
        expect(ast.body.length).toBeGreaterThanOrEqual(1);
    });
}); 