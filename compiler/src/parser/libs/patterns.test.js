const Lexer = require('../../lexer/lexer');
const Parser = require('../parser');

describe('Parser - Destructuring Patterns', () => {
    test('parses array destructuring pattern', () => {
        const code = 'let [x, y] = [1, 2];';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0]).toEqual({
            type: 'VariableDeclaration',
            kind: 'let',
            id: {
                type: 'ArrayPattern',
                elements: [
                    { type: 'Identifier', name: 'x' },
                    { type: 'Identifier', name: 'y' }
                ]
            },
            varType: null,
            init: {
                type: 'ArrayExpression',
                elements: [
                    { type: 'Literal', value: 1 },
                    { type: 'Literal', value: 2 }
                ]
            }
        });
    });
    test('parses object destructuring pattern', () => {
        const code = 'let { p, q } = obj;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        expect(ast.body[0]).toEqual({
            type: 'VariableDeclaration',
            kind: 'let',
            id: {
                type: 'ObjectPattern',
                properties: [
                    { key: 'p', value: { type: 'Identifier', name: 'p' } },
                    { key: 'q', value: { type: 'Identifier', name: 'q' } }
                ]
            },
            varType: null,
            init: { type: 'Identifier', name: 'obj' }
        });
    });
}); 