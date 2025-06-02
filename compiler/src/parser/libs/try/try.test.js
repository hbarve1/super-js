const Lexer = require('../../../lexer/lexer');
const Parser = require('../../parser');

describe('Parser - Try/Catch/Finally Statements', () => {
    test('parses try-catch', () => {
        const code = 'try { a(); } catch (e) { b(); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body.find(n => n.type === 'TryStatement');
        expect(tryStmt).toBeDefined();
        expect(tryStmt.block.type).toBe('BlockStatement');
        expect(tryStmt.handler).toBeDefined();
        expect(tryStmt.handler.param).toBe('e');
        expect(tryStmt.handler.body.type).toBe('BlockStatement');
        expect(tryStmt.finalizer).toBeNull();
    });

    test('parses try-catch-finally', () => {
        const code = 'try { a(); } catch (e) { b(); } finally { c(); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body.find(n => n.type === 'TryStatement');
        expect(tryStmt.finalizer).toBeDefined();
        expect(tryStmt.finalizer.type).toBe('BlockStatement');
    });

    test('parses try-finally (no catch)', () => {
        const code = 'try { a(); } finally { b(); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body.find(n => n.type === 'TryStatement');
        expect(tryStmt.handler).toBeNull();
        expect(tryStmt.finalizer).toBeDefined();
    });

    test('parses try-catch with empty catch param', () => {
        const code = 'try { a(); } catch { b(); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body.find(n => n.type === 'TryStatement');
        expect(tryStmt.handler.param).toBeNull();
    });

    test('parses nested try-catch', () => {
        const code = 'try { try { a(); } catch (e) { b(); } } catch (e) { c(); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const outerTry = ast.body[0];
        expect(outerTry.type).toBe('TryStatement');
        const innerTry = outerTry.block.body[0];
        expect(innerTry.type).toBe('TryStatement');
    });

    test.skip('parses throw in try/catch/finally', () => {
        const code = 'try { throw 1; } catch (e) { throw 2; } finally { throw 3; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body.find(n => n.type === 'TryStatement');
        expect(tryStmt.block.body.some(s => s.type === 'ThrowStatement')).toBe(true);
        expect(tryStmt.handler.body.body.some(s => s.type === 'ThrowStatement')).toBe(true);
        expect(tryStmt.finalizer.body.body.some(s => s.type === 'ThrowStatement')).toBe(true);
    });

    test('recovers from malformed try/catch', () => {
        const code = 'try { a(); catch (e) { b(); }'; // missing closing brace
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.some(n => n.type === 'TryStatement')).toBe(true);
    });
});
