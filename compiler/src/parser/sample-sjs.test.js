const fs = require('fs');
const path = require('path');
const Lexer = require('../lexer/lexer');
const Parser = require('./parser');

describe('Parser on sample.sjs', () => {
    const sampleFile = path.join(__dirname, 'sample.sjs');
    let lines;

    beforeAll(() => {
        const source = fs.readFileSync(sampleFile, 'utf8');
        lines = source.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('//'));
    });

    test('parses or throws as expected for each line in sample.sjs', () => {
        // Map of line index to expected AST or error substring
        const expectations = [
            { ast: { type: 'VariableDeclaration', kind: 'let', id: 'a', varType: null, init: 1 } },
            { ast: { type: 'VariableDeclaration', kind: 'const', id: 'b', varType: 'number', init: 2 } },
            { ast: { type: 'VariableDeclaration', kind: 'var', id: 'c', varType: 'string', init: null } },
            { ast: { type: 'VariableDeclaration', kind: 'let', id: 'π', varType: null, init: 3.14 } },
            { ast: { type: 'VariableDeclaration', kind: 'let', id: 'bin', varType: 'number', init: 5 } },
            { ast: { type: 'VariableDeclaration', kind: 'let', id: 'oct', varType: 'number', init: 63 } },
            { ast: { type: 'VariableDeclaration', kind: 'let', id: 'hex', varType: 'number', init: 26 } },
            { ast: { type: 'VariableDeclaration', kind: 'let', id: 's', varType: 'string', init: 'hello' } },
            { ast: { type: 'VariableDeclaration', kind: 'let', id: 'f', varType: null, init: 2.5 } },
            { ast: { type: 'VariableDeclaration', kind: 'let', id: 'flag', varType: 'boolean', init: true } },
            { ast: { type: 'VariableDeclaration', kind: 'let', id: 'nothing', varType: 'null', init: null } },
            { ast: { type: 'VariableDeclaration', kind: 'let', id: 'undef', varType: 'undefined', init: undefined } },
            { ast: { type: 'VariableDeclaration', kind: 'let', id: 'nan', varType: 'number', init: NaN } },
            { ast: { type: 'VariableDeclaration', kind: 'let', id: 'inf', varType: 'number', init: Infinity } },
            { ast: { type: 'VariableDeclaration', kind: 'let', id: '变量', varType: 'string', init: 'unicode' } },
            { error: 'Expected literal initializer' }, // arr
            { error: 'Expected literal initializer' }, // obj
            { ast: { type: 'VariableDeclaration', kind: 'let', id: 'union', varType: 'string', init: 'foo' } },
            { ast: { type: 'VariableDeclaration', kind: 'let', id: 'complex', varType: 'MyType', init: 42 } },
            { error: 'Expected variable declaration keyword' }, // function add
            { error: 'Expected variable declaration keyword' }, // function greet
            { error: 'Expected literal initializer' }, // arrow function
            { error: 'Expected variable declaration keyword' }, // class
            { error: 'Expected variable declaration keyword' }, // class field
            { error: 'Expected variable declaration keyword' }, // class field
            { error: 'Expected variable declaration keyword' }, // constructor
            { error: 'Expected variable declaration keyword' }, // this.x
            { error: 'Expected variable declaration keyword' }, // this.y
            { error: 'Expected variable declaration keyword' }, // }
            { error: 'Expected variable declaration keyword' }, // move
            { error: 'Expected variable declaration keyword' }, // this.x
            { error: 'Expected variable declaration keyword' }, // this.y
            { error: 'Expected variable declaration keyword' }, // }
            { error: 'Expected variable declaration keyword' }, // }
            { error: 'Expected literal initializer' }, // template string
        ];

        lines.forEach((line, i) => {
            const lexer = new Lexer(line);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            const expectation = expectations[i];
            if (expectation.ast) {
                const ast = parser.parse();
                if (JSON.stringify(ast) !== JSON.stringify(expectation.ast)) {
                    console.log('Line', i, ':', line);
                    console.log('Tokens:', tokens.map(t => t.toString()));
                    console.log('AST:', ast);
                    console.log('Expected:', expectation.ast);
                }
                expect(ast).toEqual(expectation.ast);
            } else if (expectation.error) {
                try {
                    parser.parse();
                    throw new Error('Expected error but parsing succeeded');
                } catch (e) {
                    if (!e.message.includes(expectation.error)) {
                        console.log('Line', i, ':', line);
                        console.log('Tokens:', tokens.map(t => t.toString()));
                        console.log('Error:', e.message);
                        console.log('Expected error:', expectation.error);
                    }
                    expect(e.message).toContain(expectation.error);
                }
            }
        });
    });
}); 
