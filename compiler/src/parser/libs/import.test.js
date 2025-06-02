const Lexer = require('../../lexer/lexer');
const Parser = require('../parser');

describe.skip('Parser - Import Statements', () => {
    test('parses simple import', () => {
        const code = "import x from 'mod';";
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const imp = ast.body[0];
        expect(imp.type).toBe('ImportDeclaration');
    });

    test('parses named import', () => {
        const code = "import { a, b } from 'mod';";
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const imp = ast.body[0];
        expect(imp.type).toBe('ImportDeclaration');
    });

    test('parses namespace import', () => {
        const code = "import * as ns from 'mod';";
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const imp = ast.body[0];
        expect(imp.type).toBe('ImportDeclaration');
    });

    test('parses side-effect import', () => {
        const code = "import 'mod';";
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const imp = ast.body[0];
        expect(imp.type).toBe('ImportDeclaration');
    });

    test('recovers from malformed import', () => {
        const code = "import from;";
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].type).toBe('ImportDeclaration');
    });
});
