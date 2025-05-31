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

    const expectations = [
        { type: 'VariableDeclaration', kind: 'let', id: 'a', varType: null, init: 1 },
        { type: 'VariableDeclaration', kind: 'const', id: 'b', varType: 'number', init: 2 },
        { type: 'VariableDeclaration', kind: 'var', id: 'c', varType: 'string', init: 'test' },
        { type: 'VariableDeclaration', kind: 'let', id: 'π', varType: null, init: 3.14 },
        { type: 'VariableDeclaration', kind: 'let', id: 'bin', varType: 'number', init: 5 },
        { type: 'VariableDeclaration', kind: 'let', id: 'oct', varType: 'number', init: 63 },
        { type: 'VariableDeclaration', kind: 'let', id: 'hex', varType: 'number', init: 26 },
        { type: 'VariableDeclaration', kind: 'let', id: 's', varType: 'string', init: 'hello' },
        { type: 'VariableDeclaration', kind: 'let', id: 'f', varType: null, init: 2.5 },
        { type: 'VariableDeclaration', kind: 'let', id: 'flag', varType: 'boolean', init: true },
        { type: 'VariableDeclaration', kind: 'let', id: 'nothing', varType: 'null', init: null },
        { type: 'VariableDeclaration', kind: 'let', id: 'undef', varType: 'undefined', init: undefined },
        { type: 'VariableDeclaration', kind: 'let', id: 'nan', varType: 'number', init: NaN },
        { type: 'VariableDeclaration', kind: 'let', id: 'inf', varType: 'number', init: Infinity },
        { type: 'VariableDeclaration', kind: 'let', id: '变量', varType: 'string', init: 'unicode' }
        // Only successful variable declarations are checked; errors are skipped by parseProgram
    ];

    test('parses all variable declarations in sample.sjs as a program', () => {
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.type).toBe('Program');
        // Only check the successful variable declarations
        const actualDecls = ast.body.filter(node => node.type === 'VariableDeclaration');
        if (actualDecls.length !== expectations.length) {
            console.log('Actual declarations:', actualDecls);
            console.log('Expected declarations:', expectations);
        }
        expect(actualDecls.length).toBe(expectations.length);
        for (let i = 0; i < expectations.length; ++i) {
            expect(actualDecls[i]).toEqual(expectations[i]);
        }
    });
}); 
