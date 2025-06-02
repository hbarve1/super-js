const Lexer = require('../../lexer/lexer');
const Parser = require('../parser');

describe.skip('Parser - Conditionals (Enterprise Grade)', () => {
    test('parses simple if statement', () => {
        const code = 'if (x > 0) { y = 1; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const ifStmt = ast.body.find(n => n.type === 'IfStatement');
        expect(ifStmt).toBeDefined();
        expect(ifStmt.test.type).toBe('BinaryExpression');
        expect(ifStmt.consequent.type).toBe('BlockStatement');
        expect(ifStmt.alternate).toBeNull();
    });

    test('parses if-else statement', () => {
        const code = 'if (flag) { a(); } else { b(); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const ifStmt = ast.body.find(n => n.type === 'IfStatement');
        expect(ifStmt.alternate.type).toBe('BlockStatement');
    });

    test('parses else-if chain', () => {
        const code = 'if (a) {} else if (b) {} else { c(); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const ifStmt = ast.body.find(n => n.type === 'IfStatement');
        expect(ifStmt.alternate.type).toBe('IfStatement');
        expect(ifStmt.alternate.alternate.type).toBe('BlockStatement');
    });

    test('parses if statement without braces', () => {
        const code = 'if (x) y = 2;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const ifStmt = ast.body.find(n => n.type === 'IfStatement');
        expect(ifStmt.consequent.type).toBe('ExpressionStatement');
    });

    test('parses nested if statements', () => {
        const code = 'if (a) if (b) c();';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const ifStmt = ast.body.find(n => n.type === 'IfStatement');
        expect(ifStmt.consequent.type).toBe('IfStatement');
    });

    test('parses ternary conditional expression', () => {
        const code = 'let x = flag ? 1 : 2;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const decl = ast.body.find(n => n.type === 'VariableDeclaration');
        expect(decl.init.type).toBe('ConditionalExpression');
    });

    test('parses switch statement', () => {
        const code = 'switch (v) { case 1: a(); break; case 2: b(); break; default: c(); }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const switchStmt = ast.body.find(n => n.type === 'SwitchStatement');
        expect(switchStmt).toBeDefined();
        expect(switchStmt.cases.length).toBeGreaterThan(0);
        expect(switchStmt.cases.some(c => c.test && c.test.type === 'Literal')).toBe(true);
        expect(switchStmt.cases.some(c => c.test === null)).toBe(true); // default
    });

    test('parses switch with fallthrough', () => {
        const code = 'switch(x) { case 1: case 2: y(); break; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const switchStmt = ast.body.find(n => n.type === 'SwitchStatement');
        expect(switchStmt.cases.length).toBe(2);
    });

    test('parses switch with empty cases', () => {
        const code = 'switch(x) { case 1: break; default: }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const switchStmt = ast.body.find(n => n.type === 'SwitchStatement');
        expect(switchStmt.cases.length).toBe(2);
    });

    test('recovers from malformed if statement', () => {
        const code = 'if x) { y = 1; }'; // missing (
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should skip or recover from the malformed if
        expect(ast.body.some(n => n.type === 'IfStatement')).toBe(true);
    });

    test('recovers from malformed switch statement', () => {
        const code = 'switch v) { case 1: a(); }'; // missing (
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should skip or recover from the malformed switch
        expect(ast.body.some(n => n.type === 'SwitchStatement')).toBe(true);
    });
});
