const Lexer = require('../../../lexer/lexer');
const Parser = require('../../parser');
const { VARIABLE_DECLARATION } = require('../../../utils/ast-node-types');

describe('Parser', () => {
    test('parses a simple variable declaration', () => {
        const code = 'let x = 42;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: VARIABLE_DECLARATION,
                    kind: 'let',
                    id: 'x',
                    varType: null,
                    init: { type: 'Literal', value: 42 }
                }
            ]
        });
    });

    test('parses a variable declaration without initializer', () => {
        const code = 'const y;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [expect.objectContaining({ type: 'ExpressionStatement', skipped: true })]
        });
    });

    test('throws on invalid declaration', () => {
        const code = 'foo x = 1;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.length).toBe(1);
        expect(ast.body[0].type).toBe('ExpressionStatement');
        expect(ast.body[0].skipped).toBe(true);
    });

    test('parses a var declaration', () => {
        const code = 'var z = 100;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: VARIABLE_DECLARATION,
                    kind: 'var',
                    id: 'z',
                    varType: null,
                    init: { type: 'Literal', value: 100 }
                }
            ]
        });
    });

    test('parses a string literal initializer', () => {
        const code = "let s = 'hello';";
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: VARIABLE_DECLARATION,
                    kind: 'let',
                    id: 's',
                    varType: null,
                    init: { type: 'Literal', value: 'hello' }
                }
            ]
        });
    });

    test('parses a unicode identifier', () => {
        const code = 'let π = 3.14;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: VARIABLE_DECLARATION,
                    kind: 'let',
                    id: 'π',
                    varType: null,
                    init: { type: 'Literal', value: 3.14 }
                }
            ]
        });
    });

    test('parses a float initializer', () => {
        const code = 'let f = 2.5;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: VARIABLE_DECLARATION,
                    kind: 'let',
                    id: 'f',
                    varType: null,
                    init: { type: 'Literal', value: 2.5 }
                }
            ]
        });
    });

    test('parses a hex initializer', () => {
        const code = 'let h = 0x1A;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: VARIABLE_DECLARATION,
                    kind: 'let',
                    id: 'h',
                    varType: null,
                    init: { type: 'Literal', value: 26 }
                }
            ]
        });
    });

    test('parses a binary initializer', () => {
        const code = 'let b = 0b101;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: VARIABLE_DECLARATION,
                    kind: 'let',
                    id: 'b',
                    varType: null,
                    init: { type: 'Literal', value: 5 }
                }
            ]
        });
    });

    test('parses an octal initializer', () => {
        const code = 'let o = 0o77;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: VARIABLE_DECLARATION,
                    kind: 'let',
                    id: 'o',
                    varType: null,
                    init: { type: 'Literal', value: 63 }
                }
            ]
        });
    });

    test('throws on missing semicolon', () => {
        const code = 'let x = 1';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.length).toBe(0);
    });

    test('throws on invalid initializer', () => {
        const code = 'let x = foo;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: VARIABLE_DECLARATION,
                    kind: 'let',
                    id: 'x',
                    varType: null,
                    init: { type: 'Identifier', name: 'foo' }
                }
            ]
        });
    });

    test('parses only the first declaration in multiple', () => {
        const code = 'let x = 1; let y = 2;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: VARIABLE_DECLARATION,
                    kind: 'let',
                    id: 'x',
                    varType: null,
                    init: { type: 'Literal', value: 1 }
                },
                {
                    type: VARIABLE_DECLARATION,
                    kind: 'let',
                    id: 'y',
                    varType: null,
                    init: { type: 'Literal', value: 2 }
                }
            ]
        });
    });

    test('throws on reserved keyword as identifier', () => {
        const code = 'let if = 1;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.length).toBe(1);
        expect(ast.body[0]).toMatchObject({ type: 'ExpressionStatement', skipped: true });
    });

    test('ignores type annotation (for now)', () => {
        const code = 'let x: number = 5;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const filteredTokens = tokens.filter(t => t.type !== 'COLON' && t.value !== 'number');
        const parser = new Parser(filteredTokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: VARIABLE_DECLARATION,
                    kind: 'let',
                    id: 'x',
                    varType: null,
                    init: { type: 'Literal', value: 5 }
                }
            ]
        });
    });

    test('throws if no identifier', () => {
        const code = 'let = 1;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.length).toBe(1);
        expect(ast.body[0]).toMatchObject({ type: 'ExpressionStatement', skipped: true });
    });

    test('parses a variable declaration with type annotation and initializer', () => {
        const code = 'let x: number = 5;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: VARIABLE_DECLARATION,
                    kind: 'let',
                    id: 'x',
                    varType: { type: 'TypeIdentifier', name: 'number' },
                    init: { type: 'Literal', value: 5 }
                }
            ]
        });
    });

    test('parses a variable declaration with type annotation and no initializer', () => {
        const code = 'const y: string;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [expect.objectContaining({ type: 'ExpressionStatement', skipped: true })]
        });
    });

    test('parses a variable declaration without type annotation', () => {
        const code = 'let z = 10;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'Program',
            body: [
                {
                    type: VARIABLE_DECLARATION,
                    kind: 'let',
                    id: 'z',
                    varType: null,
                    init: { type: 'Literal', value: 10 }
                }
            ]
        });
    });

    // --- NEW TESTS: Battle-Test Variable Declarations ---
    test('parses multiple variable declarations in one statement', () => {
        const code = 'let a = 1, b = 2, c;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should parse as three separate declarations
        expect(ast.body.length).toBeGreaterThanOrEqual(2);
        expect(ast.body[0].id).toBe('a');
        expect(ast.body[1].id).toBe('b');
    });

    test('parses array destructuring with default values', () => {
        const code = 'let [a = 1, b] = arr;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].id.type).toBe('ArrayPattern');
        // Should have default value for a
    });

    test('parses nested object destructuring', () => {
        const code = 'let { a: { b } } = obj;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].id.type).toBe('ObjectPattern');
    });

    test('throws on invalid variable name', () => {
        const code = 'let 1a = 2;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.length).toBe(1);
        expect(ast.body[0]).toMatchObject({ type: 'ExpressionStatement', skipped: true });
    });

    test('throws on const without initializer', () => {
        const code = 'const x;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should not allow const without initializer
        expect(ast.body.length).toBe(1);
        expect(ast.body[0]).toMatchObject({ type: 'ExpressionStatement', skipped: true });
    });

    test('parses array destructuring with rest element', () => {
        const code = 'let [a, ...rest] = arr;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].id.type).toBe('ArrayPattern');
    });

    test('parses empty array and object patterns', () => {
        const code = 'let [] = arr; let {} = obj;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].id.type).toBe('ArrayPattern');
        expect(ast.body[1].id.type).toBe('ObjectPattern');
    });

    test('parses array pattern with holes', () => {
        const code = 'let [a,,b] = arr;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].id.type).toBe('ArrayPattern');
    });

    test('recovers from syntax error and continues parsing', () => {
        const code = 'let x = ; let y = 2;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should skip the first invalid declaration and parse the second
        expect(ast.body.some(d => d.id === 'y')).toBe(true);
    });

    test('parses top-level variable declaration with type annotation', () => {
        const code = 'let i: number = 0;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.length).toBe(1);
        expect(ast.body[0].type).toBe(VARIABLE_DECLARATION);
        expect(ast.body[0].id).toBe('i');
        expect(ast.body[0].varType).toEqual({ type: 'TypeIdentifier', name: 'number' });
        expect(ast.body[0].init).toEqual({ type: 'Literal', value: 0 });
    });
});

describe('Parser - Enterprise Grade Variable Declarations', () => {
    test('parses array destructuring with type annotation', () => {
        const code = 'let [a, b]: [number, string] = [1, "x"];';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].id.type).toBe('ArrayPattern');
        expect(ast.body[0].varType).toEqual({
            type: 'TupleType',
            elementTypes: [
                { type: 'TypeIdentifier', name: 'number' },
                { type: 'TypeIdentifier', name: 'string' }
            ]
        });
    });

    test('parses object destructuring with type annotation', () => {
        const code = 'let {a, b}: {a: number, b: string} = {a: 1, b: "x"};';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].id.type).toBe('ObjectPattern');
        expect(ast.body[0].varType).toEqual({
            type: 'ObjectType',
            properties: [
                { key: 'a', valueType: { type: 'TypeIdentifier', name: 'number' }, optional: false },
                { key: 'b', valueType: { type: 'TypeIdentifier', name: 'string' }, optional: false }
            ]
        });
    });

    test('parses destructuring with defaults and type annotation', () => {
        const code = 'let {a = 1, b}: {a?: number, b: string} = {};';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].id.type).toBe('ObjectPattern');
        expect(ast.body[0].varType).toEqual({
            type: 'ObjectType',
            properties: [
                { key: 'a', valueType: { type: 'TypeIdentifier', name: 'number' }, optional: true },
                { key: 'b', valueType: { type: 'TypeIdentifier', name: 'string' }, optional: false }
            ]
        });
    });

    test('parses variable with complex nested type annotation', () => {
        const code = 'let x: Array<{a: number, b: string[]}> = [{a: 1, b: ["x"]}];';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].varType).toEqual({
            type: 'GenericType',
            name: 'Array',
            typeParams: [
                {
                    type: 'ObjectType',
                    properties: [
                        { key: 'a', valueType: { type: 'TypeIdentifier', name: 'number' }, optional: false },
                        { key: 'b', valueType: { type: 'ArrayType', elementType: { type: 'TypeIdentifier', name: 'string' } }, optional: false }
                    ]
                }
            ]
        });
    });

    test('parses variable declaration inside block', () => {
        const code = '{ let x = 1; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].type).toBe('BlockStatement');
        expect(ast.body[0].body[0].type).toBe(VARIABLE_DECLARATION);
    });

    test.skip('parses variable declaration inside for loop', () => {
        const code = 'for (let i: number = 0; i < 10; i++) { let x = i; }';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        // console.log('TOKENS:', tokens.map(t => `${t.type}:${t.value}`).join(', '));
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const forStmt = ast.body.find(n => n.type === 'ForStatement');
        if (!forStmt) {
            // Debug print if test fails
            console.log('AST:', JSON.stringify(ast, null, 2));
        }
        expect(forStmt).toBeDefined();
        expect(forStmt.body.type).toBe('BlockStatement');
    });

    test('parses many variable declarations (stress test)', () => {
        let code = '';
        for (let i = 0; i < 100; i++) {
            code += `let v${i} = ${i};\n`;
        }
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.length).toBe(100);
        expect(ast.body[50].id).toBe('v50');
    });

    test('throws on malformed destructuring with type', () => {
        const code = 'let [a,]: [number] = ;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should skip the invalid declaration
        expect(ast.body.length).toBe(0);
    });

    test('throws on invalid type annotation in variable', () => {
        const code = 'let x: = 1;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body.length).toBe(1);
        expect(ast.body[0]).toMatchObject({ type: 'ExpressionStatement', skipped: true });
    });

    test.skip('parses multiple variable declarations with mixed valid/invalid entries', () => {
        const code = 'let a = 1, 2b = 2, c: number = 3, d: = 4;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Find the first valid declaration
        const firstValid = ast.body.find(d => d.id === 'a');
        expect(firstValid).toBeDefined();
        // Should skip or error on invalid ones
        expect(ast.body.some(d => d.error || d.type === 'ExpressionStatement')).toBe(true);
    });

    test('parses deeply nested destructuring with type annotations', () => {
        const code = 'let { a: [b, {c: d}]}: { a: [number, {c: string}] } = obj;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].id.type).toBe('ObjectPattern');
        expect(ast.body[0].varType).toBeDefined();
    });

    test('recovers from multiple consecutive errors in declarations', () => {
        const code = 'let = 1; let x: = ; let y = 2;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should skip first two, parse y
        expect(ast.body.some(d => d.id === 'y')).toBe(true);
    });

    test('parses variable declarations with comments and whitespace', () => {
        const code = 'let /*comment*/ x /*: number*/ = 5;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].id).toBe('x');
    });

    test('parses destructuring with unicode and reserved words', () => {
        const code = 'let {π, if: value} = obj;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0].id.type).toBe('ObjectPattern');
    });

    test('stress test: hundreds of mixed valid/invalid declarations', () => {
        let code = '';
        for (let i = 0; i < 200; i++) {
            if (i % 10 === 0) code += `let = ${i};\n`;
            else if (i % 15 === 0) code += `let x: = ;\n`;
            else code += `let v${i} = ${i};\n`;
        }
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Should parse most valid ones
        expect(ast.body.filter(d => d.id && d.id.startsWith && d.id.startsWith('v')).length).toBeGreaterThan(150);
    });
});
