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

    test('parses multiple try-catch-finally blocks in a row', () => {
        const code = 'try { a(); } catch (e) { b(); } finally { c(); } try { d(); } catch (f) { g(); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmts = ast.body.filter(n => n.type === 'TryStatement');
        expect(tryStmts.length).toBe(2);
        expect(tryStmts[0].handler.param).toBe('e');
        expect(tryStmts[1].handler.param).toBe('f');
    });

    test('parses try/catch/finally with comments and whitespace', () => {
        const code = 'try /*a*/ { /*b*/ } /*c*/ catch /*d*/ (e) /*e*/ { /*f*/ } /*g*/ finally /*h*/ { /*i*/ }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body.find(n => n.type === 'TryStatement');
        expect(tryStmt).toBeDefined();
        expect(tryStmt.handler).toBeDefined();
        expect(tryStmt.finalizer).toBeDefined();
    });

    test('parses try/catch/finally with empty blocks', () => {
        const code = 'try {} catch (e) {} finally {}';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body.find(n => n.type === 'TryStatement');
        expect(tryStmt.block.body.length).toBe(0);
        expect(tryStmt.handler.body.body.length).toBe(0);
        expect(tryStmt.finalizer.body.length).toBe(0);
    });

    test('recovers from malformed try/catch/finally (missing braces)', () => {
        const code = 'try a(); catch (e) b(); finally c();';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.some(n => n.type === 'TryStatement')).toBe(true);
    });

    test('stress test: many try/catch/finally blocks', () => {
        let code = '';
        for (let i = 0; i < 50; i++) {
            code += `try { a${i}(); } catch (e) { b${i}(); } finally { c${i}(); }\n`;
        }
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.filter(n => n.type === 'TryStatement').length).toBe(50);
    });

    test('recovers from non-identifier catch param', () => {
        const code = 'try { a(); } catch (123) { b(); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body.find(n => n.type === 'TryStatement');
        // Should recover and set param to null
        expect(tryStmt.handler.param).toBeNull();
    });

    test('future: parses destructured catch param (should be null for now)', () => {
        const code = 'try { a(); } catch ({e}) { b(); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const tryStmt = ast.body.find(n => n.type === 'TryStatement');
        // Should not parse destructured param, fallback to null
        expect(tryStmt.handler.param).toBeNull();
    });
});
