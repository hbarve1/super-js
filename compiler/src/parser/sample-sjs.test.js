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

    // Map of function name to expected AST for all function declarations in sample.sjs
    const expectedFunctions = {
        ret: {
            type: 'FunctionDeclaration',
            id: 'ret',
            params: [],
            returnType: 'number',
            isGenerator: false,
            body: { type: 'BlockStatement', body: [] }
        },
        gen: {
            type: 'FunctionDeclaration',
            id: 'gen',
            params: [],
            returnType: null,
            isGenerator: true,
            body: { type: 'BlockStatement', body: [] }
        },
        afn: {
            type: 'FunctionDeclaration',
            id: 'afn',
            params: [],
            returnType: null,
            isGenerator: false,
            body: { type: 'BlockStatement', body: [] }
        },
        contractFn: {
            type: 'FunctionDeclaration',
            id: 'contractFn',
            params: [ { name: 'x', varType: 'number' } ],
            returnType: 'number',
            isGenerator: false,
            body: { type: 'BlockStatement', body: [] }
        },
        g: {
            type: 'FunctionDeclaration',
            id: 'g',
            params: [],
            returnType: null,
            isGenerator: false,
            body: { type: 'BlockStatement', body: [] }
        },
        docFn: {
            type: 'FunctionDeclaration',
            id: 'docFn',
            params: [],
            returnType: null,
            isGenerator: false,
            body: { type: 'BlockStatement', body: [] }
        },
        add: {
            type: 'FunctionDeclaration',
            id: 'add',
            params: [
                { name: 'x', varType: 'number' },
                { name: 'y', varType: 'number' }
            ],
            returnType: 'number',
            isGenerator: false,
            body: { type: 'BlockStatement', body: [] }
        },
        greet: {
            type: 'FunctionDeclaration',
            id: 'greet',
            params: [ { name: 'name', varType: 'string' } ],
            returnType: null,
            isGenerator: false,
            body: { type: 'BlockStatement', body: [] }
        }
    };

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
            } else if (node.type === 'FunctionDeclaration') {
                // Check against expected function ASTs
                expect(node).toEqual(expectedFunctions[node.id]);
            } else if (node.type === 'ClassDeclaration' && node.id === 'Point') {
                expect(node).toEqual({
                    type: 'ClassDeclaration',
                    id: 'Point',
                    superClass: null,
                    body: [
                        { type: 'ClassProperty', key: 'x', varType: 'number' },
                        { type: 'ClassProperty', key: 'y', varType: 'number' },
                        {
                            type: 'MethodDefinition',
                            key: 'constructor',
                            params: [
                                { name: 'x', varType: 'number' },
                                { name: 'y', varType: 'number' }
                            ],
                            returnType: null,
                            body: { type: 'BlockStatement', body: [] }
                        },
                        {
                            type: 'MethodDefinition',
                            key: 'move',
                            params: [
                                { name: 'dx', varType: 'number' },
                                { name: 'dy', varType: 'number' }
                            ],
                            returnType: 'void',
                            body: { type: 'BlockStatement', body: [] }
                        }
                    ]
                });
            } else if (
                node.type === 'TypeDeclaration' && node.kind === 'type' && node.id === 'Bar'
            ) {
                expect(node).toEqual({
                    type: 'TypeDeclaration',
                    kind: 'type',
                    id: 'Bar',
                    body: []
                });
            } else if (
                node.type === 'InterfaceDeclaration' && node.kind === 'interface' && node.id === 'Foo'
            ) {
                expect(node).toEqual({
                    type: 'InterfaceDeclaration',
                    kind: 'interface',
                    id: 'Foo',
                    body: []
                });
            } else if (
                node.type === 'EnumDeclaration' && node.kind === 'enum' && node.id === 'Color'
            ) {
                expect(node).toEqual({
                    type: 'EnumDeclaration',
                    kind: 'enum',
                    id: 'Color',
                    body: []
                });
            } else if (
                node.type === 'NamespaceDeclaration' && node.kind === 'namespace' && node.id === 'NS'
            ) {
                expect(node).toEqual({
                    type: 'NamespaceDeclaration',
                    kind: 'namespace',
                    id: 'NS',
                    body: []
                });
            } else if (node.type === 'IfStatement') {
                expect(node).toEqual({
                    type: 'IfStatement',
                    test: { type: 'Expression', stub: true },
                    consequent: { type: 'BlockStatement', body: [] },
                    alternate: { type: 'BlockStatement', body: [] }
                });
            } else {
                expect(node).toEqual(expect.objectContaining({
                    type: expect.any(String),
                    skipped: true
                }));
            }
        });
    });
}); 
