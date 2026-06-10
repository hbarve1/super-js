const Parser = require('../parser/parser');
const Lexer = require('../lexer/lexer');
const { TypeChecker } = require('./index');

describe('TypeChecker', () => {
    test('detects type mismatch in variable declaration', () => {
        const code = 'let x: number = "hello";';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const checker = new TypeChecker();
        expect(() => checker.check(ast)).toThrow(/Type error/);
    });

    test('accepts correct type in variable declaration', () => {
        const code = 'let x: number = 42;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const checker = new TypeChecker();
        expect(() => checker.check(ast)).not.toThrow();
    });
}); 