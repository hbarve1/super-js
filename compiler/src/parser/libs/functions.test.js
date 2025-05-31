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