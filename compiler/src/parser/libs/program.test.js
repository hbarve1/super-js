const Lexer = require('../../lexer/lexer');
const Parser = require('../parser');

describe('Parser - Program Node', () => {
    test('parses empty program', () => {
        const code = '';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.type).toBe('Program');
        expect(ast.body.length).toBe(0);
    });

    test('parses program with multiple statements', () => {
        const code = 'let x = 1; function f() {} class C {}';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.length).toBe(3);
        expect(ast.body.some(n => n.type === 'VariableDeclaration')).toBe(true);
        expect(ast.body.some(n => n.type === 'FunctionDeclaration')).toBe(true);
        expect(ast.body.some(n => n.type === 'ClassDeclaration')).toBe(true);
    });

    test('parses program with comments and whitespace', () => {
        const code = '\n// comment\nlet x = 1;\n/* block comment */\n';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.length).toBe(1);
        expect(ast.body[0].type).toBe('VariableDeclaration');
    });

    test.skip('recovers from malformed statements in program', () => {
        const code = 'let x = ; function f( { class C {}';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should skip or recover from malformed statements
        expect(ast.body.some(n => n.type === 'ClassDeclaration')).toBe(true);
    });
});
