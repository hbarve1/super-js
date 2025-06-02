const Lexer = require('../../lexer/lexer');
const Parser = require('../parser');

describe('Parser - Control Flow Statements (Enterprise Grade)', () => {
    test('parses return statement', () => {
        const code = 'function f() { return 42; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const fn = ast.body.find(n => n.type === 'FunctionDeclaration');
        expect(fn.body.body.some(s => s.type === 'ReturnStatement')).toBe(true);
    });

    test.skip('parses break and continue', () => {
        const code = 'for (;;) { if (x) break; else continue; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const forStmt = ast.body.find(n => n.type === 'ForStatement');
        expect(forStmt.body.body.some(s => s.type === 'IfStatement')).toBe(true);
        const ifStmt = forStmt.body.body.find(s => s.type === 'IfStatement');
        expect(ifStmt.consequent.type).toBe('BreakStatement');
        expect(ifStmt.alternate.type).toBe('ContinueStatement');
    });

    test('parses throw statement', () => {
        const code = 'function f() { throw new Error("fail"); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const fn = ast.body.find(n => n.type === 'FunctionDeclaration');
        expect(fn.body.body.some(s => s.type === 'ThrowStatement')).toBe(true);
    });

    test('parses try-catch-finally', () => {
        const code = 'try { a(); } catch (e) { b(); } finally { c(); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body.find(n => n.type === 'TryStatement');
        expect(tryStmt).toBeDefined();
        expect(tryStmt.block.type).toBe('BlockStatement');
        expect(tryStmt.handler).toBeDefined();
        expect(tryStmt.finalizer).toBeDefined();
    });

    test('parses try-catch without finally', () => {
        const code = 'try { a(); } catch (e) { b(); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body.find(n => n.type === 'TryStatement');
        expect(tryStmt.handler).toBeDefined();
        expect(tryStmt.finalizer).toBeNull();
    });

    test('parses try-finally without catch', () => {
        const code = 'try { a(); } finally { b(); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body.find(n => n.type === 'TryStatement');
        expect(tryStmt.handler).toBeNull();
        expect(tryStmt.finalizer).toBeDefined();
    });

    test.skip('parses throw in catch/finally', () => {
        const code = 'try { a(); } catch (e) { throw e; } finally { throw 1; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body.find(n => n.type === 'TryStatement');
        expect(tryStmt.handler.body.body.some(s => s.type === 'ThrowStatement')).toBe(true);
        expect(tryStmt.finalizer.body.body.some(s => s.type === 'ThrowStatement')).toBe(true);
    });

    test.skip('parses labeled break/continue', () => {
        const code = 'outer: for (;;) { break outer; continue outer; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const labeled = ast.body.find(n => n.type === 'LabeledStatement');
        expect(labeled.body.type).toBe('ForStatement');
        const forStmt = labeled.body;
        expect(forStmt.body.body.some(s => s.type === 'BreakStatement' || s.type === 'ContinueStatement')).toBe(true);
    });

    test('recovers from malformed try/catch', () => {
        const code = 'try { a(); catch (e) { b(); }'; // missing closing brace
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.some(n => n.type === 'TryStatement')).toBe(true);
    });

    test('recovers from malformed break/continue', () => {
        const code = 'for (;;) { break 123; continue 456; }'; // invalid label
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const forStmt = ast.body.find(n => n.type === 'ForStatement');
        expect(forStmt.body.body.some(s => s.type === 'BreakStatement' || s.type === 'ContinueStatement')).toBe(true);
    });
});
