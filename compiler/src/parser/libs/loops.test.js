const Lexer = require('../../lexer/lexer');
const Parser = require('../parser');
const { VARIABLE_DECLARATION } = require('../../utils/ast-node-types');

describe.skip('Parser - Loops (Enterprise Grade)', () => {
    test('parses simple for loop', () => {
        const code = 'for (let i = 0; i < 10; i++) { x++; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const forStmt = ast.body.find(n => n.type === 'ForStatement');
        expect(forStmt).toBeDefined();
        expect(forStmt.init.type).toBe(VARIABLE_DECLARATION);
        expect(forStmt.test.type).toBe('BinaryExpression');
        expect(forStmt.update.type).toMatch(/UpdateExpression|BinaryExpression|Identifier/);
        expect(forStmt.body.type).toBe('BlockStatement');
    });

    test('parses for...of loop', () => {
        const code = 'for (const item of items) { process(item); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const forOf = ast.body.find(n => n.type === 'ForOfStatement');
        expect(forOf).toBeDefined();
        expect(forOf.left.type).toBe(VARIABLE_DECLARATION);
        expect(forOf.right.type).toBe('Identifier');
    });

    test('parses for...in loop', () => {
        const code = 'for (let key in obj) { log(key); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const forIn = ast.body.find(n => n.type === 'ForInStatement');
        expect(forIn).toBeDefined();
        expect(forIn.left.type).toBe(VARIABLE_DECLARATION);
        expect(forIn.right.type).toBe('Identifier');
    });

    test('parses while loop', () => {
        const code = 'while (flag) { doWork(); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const whileStmt = ast.body.find(n => n.type === 'WhileStatement');
        expect(whileStmt).toBeDefined();
        expect(whileStmt.test.type).toBe('Identifier');
        expect(whileStmt.body.type).toBe('BlockStatement');
    });

    test('parses do...while loop', () => {
        const code = 'do { step(); } while (cond);';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const doWhile = ast.body.find(n => n.type === 'DoWhileStatement');
        expect(doWhile).toBeDefined();
        expect(doWhile.test.type).toBe('Identifier');
        expect(doWhile.body.type).toBe('BlockStatement');
    });

    test('parses nested loops', () => {
        const code = 'for (let i = 0; i < 3; i++) { while (x < 10) { x++; } }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const forStmt = ast.body.find(n => n.type === 'ForStatement');
        expect(forStmt.body.body.some(n => n.type === 'WhileStatement')).toBe(true);
    });

    test('parses labeled loops', () => {
        const code = 'outer: for (;;) { break outer; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const labeled = ast.body.find(n => n.type === 'LabeledStatement');
        expect(labeled).toBeDefined();
        expect(labeled.label).toBe('outer');
        expect(labeled.body.type).toBe('ForStatement');
    });

    test('parses break and continue in loops', () => {
        const code = 'for (;;) { if (x) break; else continue; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const forStmt = ast.body.find(n => n.type === 'ForStatement');
        expect(forStmt.body.body.some(n => n.type === 'IfStatement')).toBe(true);
        const ifStmt = forStmt.body.body.find(n => n.type === 'IfStatement');
        expect(ifStmt.consequent.type).toBe('BreakStatement');
        expect(ifStmt.alternate.type).toBe('ContinueStatement');
    });

    test('parses loop with destructuring', () => {
        const code = 'for (const [a, b] of pairs) { use(a, b); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const forOf = ast.body.find(n => n.type === 'ForOfStatement');
        expect(forOf.left.id.type).toBe('ArrayPattern');
    });

    test('parses loop with type annotations', () => {
        const code = 'for (let x: number = 0; x < 5; x++) {}';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const forStmt = ast.body.find(n => n.type === 'ForStatement');
        expect(forStmt.init.varType).toEqual({ type: 'TypeIdentifier', name: 'number' });
    });

    test('parses infinite for loop', () => {
        const code = 'for (;;) { break; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const forStmt = ast.body.find(n => n.type === 'ForStatement');
        expect(forStmt).toBeDefined();
        expect(forStmt.test).toBeNull();
        expect(forStmt.update).toBeNull();
    });

    test('recovers from malformed loop', () => {
        const code = 'for (let i = 0 i < 10; i++) { x++; }'; // missing semicolon
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should skip or recover from the malformed loop
        expect(ast.body.some(n => n.type === 'ForStatement')).toBe(true);
    });
});
