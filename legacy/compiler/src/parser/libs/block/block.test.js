const Lexer = require('../../../lexer/lexer');
const Parser = require('../../parser');
const { VARIABLE_DECLARATION } = require('../../../utils/ast-node-types');

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
        expect(ast.body[0].type).toBe(VARIABLE_DECLARATION);
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

describe('Try/Catch/Finally Parser', () => {
    test('parses try with catch', () => {
        const code = 'try { let x = 1; } catch (e) { let y = 2; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body[0];
        expect(tryStmt.type).toBe('TryStatement');
        expect(tryStmt.block.type).toBe('BlockStatement');
        expect(tryStmt.handler).toBeDefined();
        expect(tryStmt.handler.param).toBe('e');
        expect(tryStmt.handler.body.type).toBe('BlockStatement');
        expect(tryStmt.finalizer).toBeNull();
    });
    test('parses try with catch and finally', () => {
        const code = 'try { let x = 1; } catch (e) { let y = 2; } finally { let z = 3; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body[0];
        expect(tryStmt.type).toBe('TryStatement');
        expect(tryStmt.handler).toBeDefined();
        expect(tryStmt.finalizer).toBeDefined();
        expect(tryStmt.finalizer.type).toBe('BlockStatement');
    });
    test('parses try with only finally', () => {
        const code = 'try { let x = 1; } finally { let z = 3; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body[0];
        expect(tryStmt.type).toBe('TryStatement');
        expect(tryStmt.handler).toBeNull();
        expect(tryStmt.finalizer).toBeDefined();
    });
    test('parses try/catch with empty catch param', () => {
        const code = 'try { let x = 1; } catch { let y = 2; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body[0];
        expect(tryStmt.type).toBe('TryStatement');
        expect(tryStmt.handler).toBeDefined();
        expect(tryStmt.handler.param).toBeNull();
    });
    test('parses nested try/catch', () => {
        const code = 'try { try { let x = 1; } catch (e) { } } catch (e) { }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const outerTry = ast.body[0];
        expect(outerTry.type).toBe('TryStatement');
        const innerTry = outerTry.block.body[0];
        expect(innerTry.type).toBe('TryStatement');
    });
    test('parses try/catch with statements inside', () => {
        const code = 'try { let x = 1; let y = 2; } catch (e) { let z = 3; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body[0];
        expect(tryStmt.block.body.length).toBe(2);
        expect(tryStmt.handler.body.body.length).toBe(1);
    });
    test.skip('recovers from malformed try/catch', () => {
        const code = 'try { let x = ; } catch (e) { let y = 2; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body[0];
        console.log('TRY BLOCK BODY:', JSON.stringify(tryStmt.block.body, null, 2));
        expect(tryStmt.type).toBe('TryStatement');
        expect(tryStmt.block.body.some(d => d.type === 'ExpressionStatement' && d.skipped)).toBe(true);
        expect(tryStmt.handler.body.body.some(d => d.id === 'y')).toBe(true);
    });
});
