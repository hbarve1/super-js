const fs = require('fs');
const path = require('path');
const Lexer = require('../lexer/lexer');
const Parser = require('./parser');

describe('Parser full program from sample.sjs', () => {
    const sampleFile = path.join(__dirname, 'sample.sjs');
    let source;

    beforeAll(() => {
        source = fs.readFileSync(sampleFile, 'utf8');
    });

    // Expected sequence of node types for the current sample.sjs
    const expectedNodeTypes =  [
        "VariableDeclaration",
        "VariableDeclaration",
        "VariableDeclaration",
        "VariableDeclaration",
        "VariableDeclaration",
        "VariableDeclaration",
        "VariableDeclaration",
        "VariableDeclaration",
        "VariableDeclaration",
        "VariableDeclaration",
        "VariableDeclaration",
        "VariableDeclaration",
        "VariableDeclaration",
        "VariableDeclaration",
        "VariableDeclaration",
        "ExpressionStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "TypeDeclaration",
        "ExpressionStatement",
        "ExpressionStatement",
        "TypeDeclaration",
        "TypeDeclaration",
        "TypeDeclaration",
        "ExpressionStatement",
        "ControlFlowStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "ControlFlowStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "ControlFlowStatement",
        "ExpressionStatement",
        "ControlFlowStatement",
        "ExpressionStatement",
        "ControlFlowStatement",
        "ControlFlowStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "FunctionDeclaration",
        "ExpressionStatement",
        "FunctionDeclaration",
        "ExpressionStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "FunctionDeclaration",
        "ExpressionStatement",
        "ControlFlowStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "FunctionDeclaration",
        "ExpressionStatement",
        "FunctionDeclaration",
        "ControlFlowStatement",
        "ExpressionStatement",
        "FunctionDeclaration",
        "ExpressionStatement",
        "FunctionDeclaration",
        "ExpressionStatement",
        "ClassDeclaration",
        "ExpressionStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "ExpressionStatement",
        "ExpressionStatement"
      ];
    // const expectedNodeTypes = [
    //     'VariableDeclaration', // let a = 1;
    //     'VariableDeclaration', // const b: number = 2;
    //     'VariableDeclaration', // var c: string = 'test';
    //     'VariableDeclaration', // let π = 3.14;
    //     'VariableDeclaration', // let bin: number = 0b101;
    //     'VariableDeclaration', // let oct: number = 0o77;
    //     'VariableDeclaration', // let hex: number = 0x1A;
    //     'VariableDeclaration', // let s: string = 'hello';
    //     'VariableDeclaration', // let f = 2.5;
    //     'VariableDeclaration', // let flag: boolean = true;
    //     'VariableDeclaration', // let nothing: null = null;
    //     'VariableDeclaration', // let undef: undefined = undefined;
    //     'VariableDeclaration', // let nan: number = NaN;
    //     'VariableDeclaration', // let inf: number = Infinity;
    //     'VariableDeclaration', // let 变量: string = 'unicode';
    //     'ExpressionStatement', // let arr: number[] = [1, 2, 3]; (unsupported)
    //     'ExpressionStatement', // let obj: { p: number, q: number } = { p: 1, q: 2 };
    //     'ExpressionStatement', // let union: string | number = 'foo';
    //     'ExpressionStatement', // let complex: { x: number, y: string } = { x: 1, y: 'bar' };
    //     'ExpressionStatement', // let message: string = `The value is ${a}`;
    //     'ExpressionStatement', // let sum = a + b;
    //     'ExpressionStatement', // let isEqual = a === b;
    //     'ExpressionStatement', // let isNot = !flag;
    //     'ExpressionStatement', // let tern = flag ? a : b;
    //     'ExpressionStatement', // let called = add(a, b);
    //     'ExpressionStatement', // let member = obj.p;
    //     'ExpressionStatement', // let [x, y] = [1, 2];
    //     'ExpressionStatement', // let { p, q } = obj;
    //     'TypeDeclaration',     // interface Foo { ... }
    //     'TypeDeclaration',     // type Bar = ...
    //     'TypeDeclaration',     // enum Color ...
    //     'TypeDeclaration',     // namespace NS ...
    //     'ControlFlowStatement',// if (a > 0) { ... }
    //     'ControlFlowStatement',// for (let i = 0; ...)
    //     'ControlFlowStatement',// while (a < 100) ...
    //     'ControlFlowStatement',// do { ... } while (a > 0);
    //     'ControlFlowStatement',// switch (b) { ... }
    //     'FunctionDeclaration', // function ret(): number { ... }
    //     'FunctionDeclaration', // function* gen() { ... }
    //     'FunctionDeclaration', // async function afn() { ... }
    //     'ExpressionStatement', // const d = Object.freeze({ x: 1 });
    //     'FunctionDeclaration', // function contractFn(x: number): number { ... }
    //     'ControlFlowStatement',// try { ... } catch ...
    //     'FunctionDeclaration', // function g() { ... }
    //     'FunctionDeclaration', // function docFn() {}
    //     'ControlFlowStatement',// with (obj) { debugger; }
    //     'ExpressionStatement', // let message: string = `The value is ${a}`;
    //     'FunctionDeclaration', // function add(x: number, y: number): number { ... }
    //     'FunctionDeclaration', // function greet(name: string) { ... }
    //     'ExpressionStatement', // const arrow = (x: number): number => x * 2;
    //     'ClassDeclaration',    // class Point { ... }
    // ];

    test('parses all top-level constructs in sample.sjs as a program (structure)', () => {
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.type).toBe('Program');
        ast.body.forEach((node) => {
            if (node.type === 'VariableDeclaration') {
                expect(typeof node.kind).toBe('string');
                expect(typeof node.id).toBe('string');
                expect(node).toHaveProperty('varType');
                expect(node).toHaveProperty('init');
            } else {
                expect(node).toEqual(expect.objectContaining({
                    type: expect.any(String),
                    skipped: true
                }));
            }
        });
    });
}); 
