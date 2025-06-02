const Lexer = require('../../../lexer/lexer');
const Parser = require('../../parser');

describe('Parser - Export Statements', () => {
    test('parses simple export', () => {
        const code = 'export const x = 1;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const exp = ast.body[0];
        expect(exp.type).toBe('ExportDeclaration');
    });

    test('parses named export', () => {
        const code = 'export { a, b };';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const exp = ast.body[0];
        expect(exp.type).toBe('ExportDeclaration');
    });

    test('parses export default', () => {
        const code = 'export default 42;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const exp = ast.body[0];
        expect(exp.type).toBe('ExportDeclaration');
    });

    test('parses export all', () => {
        const code = "export * from 'mod';";
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const exp = ast.body[0];
        expect(exp.type).toBe('ExportDeclaration');
    });

    test('recovers from malformed export', () => {
        const code = 'export ;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].type).toBe('ExportDeclaration');
    });
});
