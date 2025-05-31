const Lexer = require('../../lexer/lexer');
const Parser = require('../parser');

function parseBlockFromCode(code) {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    // Advance to first LEFT_BRACE
    while (parser.current.type !== parser.TokenType.LEFT_BRACE && parser.current.type !== parser.TokenType.EOF) {
        parser.advance();
    }
    return parser.parseBlockStatement();
}

describe('BlockStatement Parser', () => {
    test('parses empty block', () => {
        const ast = parseBlockFromCode('{}');
        expect(ast).toEqual({ type: 'BlockStatement', body: [] });
    });

    test('parses block with one statement', () => {
        const ast = parseBlockFromCode('{ let x = 1; }');
        expect(ast.body.length).toBe(1);
        expect(ast.body[0].type).toBe('VariableDeclaration');
        expect(ast.body[0].id).toBe('x');
    });

    test('parses block with multiple statements', () => {
        const ast = parseBlockFromCode('{ let x = 1; let y = 2; }');
        expect(ast.body.length).toBe(2);
        expect(ast.body[0].id).toBe('x');
        expect(ast.body[1].id).toBe('y');
    });

    test('parses nested blocks', () => {
        const ast = parseBlockFromCode('{ { let x = 1; } let y = 2; }');
        expect(ast.body[0].type).toBe('BlockStatement');
        expect(ast.body[0].body[0].id).toBe('x');
        expect(ast.body[1].id).toBe('y');
    });

    test('parses block with control flow', () => {
        const ast = parseBlockFromCode('{ if (true) { let x = 1; } }');
        expect(ast.body[0].type).toBe('IfStatement');
        expect(ast.body[0].consequent.type).toBe('BlockStatement');
    });

    test('recovers from error in block', () => {
        const ast = parseBlockFromCode('{ let x = ; let y = 2; }');
        // Should skip the first invalid declaration and parse the second
        expect(ast.body.some(d => d.id === 'y')).toBe(true);
    });

    test('parses block with only comments/whitespace', () => {
        const ast = parseBlockFromCode('{ /* comment */ }');
        expect(ast.body.length).toBe(0);
    });

    test('parses block with return, break, continue, throw', () => {
        const ast = parseBlockFromCode('{ return 1; break; continue; throw 2; }');
        expect(ast.body.map(s => s.type)).toEqual([
            'ReturnStatement',
            'BreakStatement',
            'ContinueStatement',
            'ThrowStatement'
        ]);
    });
}); 