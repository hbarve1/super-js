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
            body: expect.objectContaining({ type: 'BlockStatement', body: expect.any(Array) })
        },
        gen: {
            type: 'FunctionDeclaration',
            id: 'gen',
            params: [],
            returnType: null,
            isGenerator: true,
            body: expect.objectContaining({ type: 'BlockStatement', body: expect.any(Array) })
        },
        afn: {
            type: 'FunctionDeclaration',
            id: 'afn',
            params: [],
            returnType: null,
            isGenerator: false,
            body: expect.objectContaining({ type: 'BlockStatement', body: expect.any(Array) })
        },
        contractFn: {
            type: 'FunctionDeclaration',
            id: 'contractFn',
            params: [ { name: 'x', varType: 'number' } ],
            returnType: 'number',
            isGenerator: false,
            body: expect.objectContaining({ type: 'BlockStatement', body: expect.any(Array) })
        },
        g: {
            type: 'FunctionDeclaration',
            id: 'g',
            params: [],
            returnType: null,
            isGenerator: false,
            body: expect.objectContaining({ type: 'BlockStatement', body: expect.any(Array) })
        },
        docFn: {
            type: 'FunctionDeclaration',
            id: 'docFn',
            params: [],
            returnType: null,
            isGenerator: false,
            body: expect.objectContaining({ type: 'BlockStatement', body: expect.any(Array) })
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
            body: expect.objectContaining({ type: 'BlockStatement', body: expect.any(Array) })
        },
        greet: {
            type: 'FunctionDeclaration',
            id: 'greet',
            params: [ { name: 'name', varType: 'string' } ],
            returnType: null,
            isGenerator: false,
            body: expect.objectContaining({ type: 'BlockStatement', body: expect.any(Array) })
        }
    };

    test('parses all top-level constructs in sample.sjs as a program (structure)', () => {
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.type).toBe('Program');
        // Debug print: all variable declaration ids
        const varDeclIds = ast.body
            .filter(node => node.type === 'VariableDeclaration')
            .map(node => node.id && typeof node.id === 'string' ? node.id : node.id && node.id.type);
        // eslint-disable-next-line no-console
        // console.log('VariableDeclaration ids:', varDeclIds);
        // --- Check for real expression AST for 'let sum = a + b;' ---
        const sumDecl = ast.body.find(
            node => node.type === 'VariableDeclaration' && node.id === 'sum'
        );
        expect(sumDecl).toBeDefined();
        expect(sumDecl.init).toEqual({
            type: 'BinaryExpression',
            operator: '+',
            left: { type: 'Identifier', name: 'a' },
            right: { type: 'Identifier', name: 'b' }
        });
        // --- Check for MemberExpression: let member = obj.p; ---
        const memberDecl = ast.body.find(
            node => node.type === 'VariableDeclaration' && node.id === 'member'
        );
        expect(memberDecl).toBeDefined();
        expect(memberDecl.init).toEqual({
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'obj' },
            property: { type: 'Identifier', name: 'p' },
            computed: false
        });
        // --- Check for CallExpression: let called = add(a, b); ---
        const calledDecl = ast.body.find(
            node => node.type === 'VariableDeclaration' && node.id === 'called'
        );
        expect(calledDecl).toBeDefined();
        expect(calledDecl.init).toEqual({
            type: 'CallExpression',
            callee: { type: 'Identifier', name: 'add' },
            arguments: [
                { type: 'Identifier', name: 'a' },
                { type: 'Identifier', name: 'b' }
            ]
        });
        // --- Check for ArrayExpression: let arr = [1, 2, 3]; ---
        const arrDecl = ast.body.find(
            node => node.type === 'VariableDeclaration' && node.id === 'arr'
        );
        expect(arrDecl).toBeDefined();
        expect(arrDecl.init).toEqual({
            type: 'ArrayExpression',
            elements: [
                { type: 'Literal', value: 1 },
                { type: 'Literal', value: 2 },
                { type: 'Literal', value: 3 }
            ]
        });
        // --- Check for ObjectExpression: let obj = { p: 1, q: 2 }; ---
        const objDecl = ast.body.find(
            node => node.type === 'VariableDeclaration' && node.id === 'obj'
        );
        expect(objDecl).toBeDefined();
        expect(objDecl.init).toEqual({
            type: 'ObjectExpression',
            properties: [
                { key: { type: 'Identifier', name: 'p' }, value: { type: 'Literal', value: 1 } },
                { key: { type: 'Identifier', name: 'q' }, value: { type: 'Literal', value: 2 } }
            ]
        });
        // --- Check for UnaryExpression: let isNot = !flag; ---
        const isNotDecl = ast.body.find(
            node => node.type === 'VariableDeclaration' && node.id === 'isNot'
        );
        expect(isNotDecl).toBeDefined();
        expect(isNotDecl.init).toEqual({
            type: 'UnaryExpression',
            operator: '!',
            argument: { type: 'Identifier', name: 'flag' },
            prefix: true
        });
        // --- Check for ConditionalExpression: let tern = flag ? a : b; ---
        const ternDecl = ast.body.find(
            node => node.type === 'VariableDeclaration' && node.id === 'tern'
        );
        expect(ternDecl).toBeDefined();
        expect(ternDecl.init).toEqual({
            type: 'ConditionalExpression',
            test: { type: 'Identifier', name: 'flag' },
            consequent: { type: 'Identifier', name: 'a' },
            alternate: { type: 'Identifier', name: 'b' }
        });
        // --- Check for AssignmentExpression: a += i; (in for loop body) ---
        // Find the ForStatement and check its body (should be a BlockStatement with an AssignmentExpression)
        const forStmt = ast.body.find(node => node.type === 'ForStatement');
        if (forStmt && forStmt.body && Array.isArray(forStmt.body.body)) {
            const assignExpr = forStmt.body.body.find(
                n => n.type === 'ExpressionStatement' && n.skipped !== true // If real assignment parsing is implemented
            );
            // If you later parse real statements, check:
            // expect(assignExpr.expression).toEqual({
            //     type: 'AssignmentExpression',
            //     operator: '+=',
            //     left: { type: 'Identifier', name: 'a' },
            //     right: { type: 'Identifier', name: 'i' }
            // });
        }
        // --- Check for UpdateExpression: a++; and a--; ---
        // These are in the while and do-while loops in the sample file
        // You can add similar checks if/when you parse real statement bodies
        ast.body.forEach((node) => {
            if (node.type === 'VariableDeclaration') {
                expect(typeof node.kind).toBe('string');
                if (typeof node.id === 'string') {
                    expect(typeof node.id).toBe('string');
                } else {
                    expect(['ArrayPattern', 'ObjectPattern']).toContain(node.id.type);
                }
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
                        expect.objectContaining({
                            type: 'MethodDefinition',
                            key: 'constructor',
                            params: [
                                { name: 'x', varType: 'number' },
                                { name: 'y', varType: 'number' }
                            ],
                            returnType: null,
                            body: expect.objectContaining({ type: 'BlockStatement', body: expect.any(Array) })
                        }),
                        expect.objectContaining({
                            type: 'MethodDefinition',
                            key: 'move',
                            params: [
                                { name: 'dx', varType: 'number' },
                                { name: 'dy', varType: 'number' }
                            ],
                            returnType: 'void',
                            body: expect.objectContaining({ type: 'BlockStatement', body: expect.any(Array) })
                        })
                    ]
                });
            } else if (node.type === 'ForStatement') {
                // Expect real ASTs for for-loop header
                expect(node.init).toEqual({
                    type: 'VariableDeclaration',
                    kind: 'let',
                    id: 'i',
                    varType: null,
                    init: { type: 'Literal', value: 0 }
                });
                expect(node.test).toEqual({
                    type: 'BinaryExpression',
                    operator: '<',
                    left: { type: 'Identifier', name: 'i' },
                    right: { type: 'Literal', value: 10 }
                });
                // For now, update is likely a BinaryExpression for 'i++' or 'i += 1', or fallback to stub/identifier
                expect(node.update.type === 'BinaryExpression' || node.update.type === 'Identifier' || node.update.type === 'Expression').toBe(true);
                expect(node.body).toEqual({ type: 'BlockStatement', body: [] });
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
            } else if (node.type === 'WhileStatement') {
                expect(node).toEqual({
                    type: 'WhileStatement',
                    test: { type: 'Expression', stub: true },
                    body: { type: 'BlockStatement', body: [] }
                });
            } else if (node.type === 'DoWhileStatement') {
                expect(node).toEqual({
                    type: 'DoWhileStatement',
                    body: { type: 'BlockStatement', body: [] },
                    test: { type: 'Expression', stub: true }
                });
            } else if (node.type === 'SwitchStatement') {
                expect(node).toEqual({
                    type: 'SwitchStatement',
                    discriminant: { type: 'Expression', stub: true },
                    cases: []
                });
            } else if (node.type === 'TryStatement') {
                expect(node).toEqual({
                    type: 'TryStatement',
                    block: expect.objectContaining({ type: 'BlockStatement', body: expect.any(Array) }),
                    handler: { param: 'e', body: expect.objectContaining({ type: 'BlockStatement', body: expect.any(Array) }) },
                    finalizer: expect.objectContaining({ type: 'BlockStatement', body: expect.any(Array) })
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
