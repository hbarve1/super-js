const Lexer = require('../../../lexer/lexer');
const Parser = require('../../parser');

describe('Parser - Statements (Enterprise Grade)', () => {
    test('parses expression statement', () => {
        const code = 'x + y;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const stmt = ast.body[0];
        expect(stmt.type).toBe('ExpressionStatement');
    });

    test('parses block statement', () => {
        const code = '{ let x = 1; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const block = ast.body[0];
        expect(block.type).toBe('BlockStatement');
        expect(block.body.length).toBe(1);
    });

    test('parses variable declaration statement', () => {
        const code = 'let a = 2;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const decl = ast.body[0];
        expect(decl.type).toBe('VariableDeclaration');
    });

    test('parses function declaration statement', () => {
        const code = 'function foo() {}';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const fn = ast.body[0];
        expect(fn.type).toBe('FunctionDeclaration');
    });

    test('parses class declaration statement', () => {
        const code = 'class Bar {}';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const cls = ast.body[0];
        expect(cls.type).toBe('ClassDeclaration');
    });

    test.skip('parses import and export statements', () => {
        const code = "import x from 'm'; export { x };";
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].type).toBe('ImportDeclaration');
        expect(ast.body[1].type).toBe('ExportDeclaration');
    });

    test('parses type, interface, enum, and namespace statements', () => {
        const code = 'type T = number; interface I {} enum E {} namespace N {}';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.some(n => n.type === 'TypeDeclaration')).toBe(true);
        expect(ast.body.some(n => n.type === 'InterfaceDeclaration')).toBe(true);
        expect(ast.body.some(n => n.type === 'EnumDeclaration')).toBe(true);
        expect(ast.body.some(n => n.type === 'NamespaceDeclaration')).toBe(true);
    });

    test.skip('recovers from malformed statement', () => {
        const code = 'let = ;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should skip or recover from the malformed statement
        expect(ast.body.length).toBe(0);
    });
});
