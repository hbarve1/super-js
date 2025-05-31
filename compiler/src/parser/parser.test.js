const Lexer = require('../lexer/lexer');
const Parser = require('./parser');

describe('Parser', () => {
    test('parses a simple variable declaration', () => {
        const code = 'let x = 42;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: 'VariableDeclaration',
                    kind: 'let',
                    id: 'x',
                    varType: null,
                    init: { type: 'Literal', value: 42 }
                }
            ]
        });
    });

    test('parses a variable declaration without initializer', () => {
        const code = 'const y;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: 'VariableDeclaration',
                    kind: 'const',
                    id: 'y',
                    varType: null,
                    init: null
                }
            ]
        });
    });

    test('throws on invalid declaration', () => {
        const code = 'foo x = 1;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.length).toBe(1);
        expect(ast.body[0].type).toBe('ExpressionStatement');
        expect(ast.body[0].skipped).toBe(true);
    });

    test('parses a var declaration', () => {
        const code = 'var z = 100;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: 'VariableDeclaration',
                    kind: 'var',
                    id: 'z',
                    varType: null,
                    init: { type: 'Literal', value: 100 }
                }
            ]
        });
    });

    test('parses a string literal initializer', () => {
        const code = "let s = 'hello';";
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: 'VariableDeclaration',
                    kind: 'let',
                    id: 's',
                    varType: null,
                    init: { type: 'Literal', value: 'hello' }
                }
            ]
        });
    });

    test('parses a unicode identifier', () => {
        const code = 'let π = 3.14;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: 'VariableDeclaration',
                    kind: 'let',
                    id: 'π',
                    varType: null,
                    init: { type: 'Literal', value: 3.14 }
                }
            ]
        });
    });

    test('parses a float initializer', () => {
        const code = 'let f = 2.5;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: 'VariableDeclaration',
                    kind: 'let',
                    id: 'f',
                    varType: null,
                    init: { type: 'Literal', value: 2.5 }
                }
            ]
        });
    });

    test('parses a hex initializer', () => {
        const code = 'let h = 0x1A;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: 'VariableDeclaration',
                    kind: 'let',
                    id: 'h',
                    varType: null,
                    init: { type: 'Literal', value: 26 }
                }
            ]
        });
    });

    test('parses a binary initializer', () => {
        const code = 'let b = 0b101;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: 'VariableDeclaration',
                    kind: 'let',
                    id: 'b',
                    varType: null,
                    init: { type: 'Literal', value: 5 }
                }
            ]
        });
    });

    test('parses an octal initializer', () => {
        const code = 'let o = 0o77;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: 'VariableDeclaration',
                    kind: 'let',
                    id: 'o',
                    varType: null,
                    init: { type: 'Literal', value: 63 }
                }
            ]
        });
    });

    test('throws on missing semicolon', () => {
        const code = 'let x = 1';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.length).toBe(0);
    });

    test('throws on invalid initializer', () => {
        const code = 'let x = foo;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: 'VariableDeclaration',
                    kind: 'let',
                    id: 'x',
                    varType: null,
                    init: { type: 'Identifier', name: 'foo' }
                }
            ]
        });
    });

    test('parses only the first declaration in multiple', () => {
        const code = 'let x = 1; let y = 2;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: 'VariableDeclaration',
                    kind: 'let',
                    id: 'x',
                    varType: null,
                    init: { type: 'Literal', value: 1 }
                },
                {
                    type: 'VariableDeclaration',
                    kind: 'let',
                    id: 'y',
                    varType: null,
                    init: { type: 'Literal', value: 2 }
                }
            ]
        });
    });

    test('throws on reserved keyword as identifier', () => {
        const code = 'let if = 1;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.length).toBe(0);
    });

    test('ignores type annotation (for now)', () => {
        const code = 'let x: number = 5;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const filteredTokens = tokens.filter(t => t.type !== 'COLON' && t.value !== 'number');
        const parser = new Parser(filteredTokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: 'VariableDeclaration',
                    kind: 'let',
                    id: 'x',
                    varType: null,
                    init: { type: 'Literal', value: 5 }
                }
            ]
        });
    });

    test('throws if no identifier', () => {
        const code = 'let = 1;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.length).toBe(0);
    });

    test('parses a variable declaration with type annotation and initializer', () => {
        const code = 'let x: number = 5;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: 'VariableDeclaration',
                    kind: 'let',
                    id: 'x',
                    varType: 'number',
                    init: { type: 'Literal', value: 5 }
                }
            ]
        });
    });

    test('parses a variable declaration with type annotation and no initializer', () => {
        const code = 'const y: string;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: 'VariableDeclaration',
                    kind: 'const',
                    id: 'y',
                    varType: 'string',
                    init: null
                }
            ]
        });
    });

    test('parses a variable declaration without type annotation', () => {
        const code = 'let z = 10;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: 'VariableDeclaration',
                    kind: 'let',
                    id: 'z',
                    varType: null,
                    init: { type: 'Literal', value: 10 }
                }
            ]
        });
    });
});

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
