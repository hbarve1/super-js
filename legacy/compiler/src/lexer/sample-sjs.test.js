const fs = require('fs');
const path = require('path');
const Lexer = require('./lexer');
const TokenType = require('./libs/token-types');

describe('Lexer on sample.sjs (all keywords)', () => {
    const sampleFile = path.join(__dirname, 'sample.sjs');
    let tokens;

    beforeAll(() => {
        const source = fs.readFileSync(sampleFile, 'utf8');
        const lexer = new Lexer(source);
        tokens = lexer.tokenize();
    });

    test('should produce tokens for the sample file', () => {
        expect(tokens.length).toBeGreaterThan(0);
    });

    test('should not produce any ERROR tokens', () => {
        const errorTokens = tokens.filter(t => t.type === TokenType.ERROR);
        expect(errorTokens.length).toBe(0);
    });

    test('should end with EOF token', () => {
        expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });
}); 
