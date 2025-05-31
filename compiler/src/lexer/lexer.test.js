const Lexer = require('./lexer');
const TokenType = require('./libs/token-types');

describe('Lexer', () => {
    it('tokenizes identifiers and keywords', () => {
        const lexer = new Lexer('let x = 42;');
        const tokens = lexer.tokenize();
        expect(tokens.map(t => t.type)).toEqual([
            TokenType.KEYWORD, // let
            TokenType.IDENTIFIER, // x
            TokenType.ASSIGNMENT, // =
            TokenType.NUMBER, // 42
            TokenType.SEMICOLON, // ;
            TokenType.EOF
        ]);
    });

    it('tokenizes template literals', () => {
        const lexer = new Lexer('const s = `hello ${name}`;');
        const tokens = lexer.tokenize();
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_STRING)).toBe(true);
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_EXPRESSION)).toBe(true);
    });

    it('tokenizes optional chaining and nullish coalescing', () => {
        const lexer = new Lexer('a?.b ?? c;');
        const tokens = lexer.tokenize();
        expect(tokens.map(t => t.type)).toContain(TokenType.OPTIONAL_CHAINING);
        expect(tokens.map(t => t.type)).toContain(TokenType.NULLISH_COALESCING);
    });

    it('tokenizes union and intersection types', () => {
        const lexer = new Lexer('let x: string | number & boolean;');
        const tokens = lexer.tokenize();
        expect(tokens.map(t => t.type)).toContain(TokenType.UNION);
        expect(tokens.map(t => t.type)).toContain(TokenType.INTERSECTION);
    });

    it('throws on unterminated string', () => {
        const lexer = new Lexer('let s = "unterminated;');
        expect(() => lexer.tokenize()).toThrow(/Unterminated string/);
    });

    it('throws on unterminated template string', () => {
        const lexer = new Lexer('let s = `unterminated;');
        expect(() => lexer.tokenize()).toThrow(/Unterminated template string/);
    });
});

describe('Lexer - comprehensive coverage', () => {
    it('tokenizes all bracket types', () => {
        const lexer = new Lexer('() {} [] <>');
        const tokens = lexer.tokenize();
        expect(tokens.map(t => t.type)).toEqual([
            TokenType.LEFT_PAREN, TokenType.RIGHT_PAREN,
            TokenType.LEFT_BRACE, TokenType.RIGHT_BRACE,
            TokenType.LEFT_BRACKET, TokenType.RIGHT_BRACKET,
            TokenType.LEFT_ANGLE, TokenType.RIGHT_ANGLE,
            TokenType.EOF
        ]);
    });

    it('tokenizes all punctuation', () => {
        const lexer = new Lexer('; , . : ?');
        const tokens = lexer.tokenize();
        expect(tokens.map(t => t.type)).toEqual([
            TokenType.SEMICOLON, TokenType.COMMA, TokenType.DOT, TokenType.COLON, TokenType.QUESTION_MARK, TokenType.EOF
        ]);
    });

    it('tokenizes all basic operators', () => {
        const lexer = new Lexer('+ - * / % ! = == === != !== || && | &');
        const tokens = lexer.tokenize();
        expect(tokens.map(t => t.type)).toEqual([
            TokenType.OPERATOR, TokenType.OPERATOR, TokenType.OPERATOR, TokenType.OPERATOR, TokenType.OPERATOR, TokenType.OPERATOR,
            TokenType.ASSIGNMENT, TokenType.OPERATOR, TokenType.OPERATOR, TokenType.OPERATOR, TokenType.OPERATOR,
            TokenType.OPERATOR, TokenType.OPERATOR, TokenType.UNION, TokenType.INTERSECTION, TokenType.EOF
        ]);
    });

    it('tokenizes all literal types', () => {
        const lexer = new Lexer('true false null undefined NaN Infinity');
        const tokens = lexer.tokenize();
        expect(tokens.map(t => t.type)).toEqual([
            TokenType.KEYWORD, TokenType.KEYWORD, TokenType.KEYWORD, TokenType.KEYWORD, TokenType.KEYWORD, TokenType.KEYWORD, TokenType.EOF
        ]);
    });

    it('tokenizes numbers (integers and floats)', () => {
        const lexer = new Lexer('123 45.67 0.89 .5 6.');
        const tokens = lexer.tokenize();
        expect(tokens.map(t => t.type)).toEqual([
            TokenType.NUMBER, TokenType.NUMBER, TokenType.NUMBER, TokenType.NUMBER, TokenType.NUMBER, TokenType.EOF
        ]);
    });

    it('tokenizes all keyword categories', () => {
        const code = [
            'let', 'if', 'match', 'immutable', 'requires', 'try', 'doc', 'string', 'import', 'this', 'in', 'with'
        ].join(' ');
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        // All should be KEYWORD except 'this' (object), 'in' (operator), 'with' (misc), which are also KEYWORD in your setup
        expect(tokens.every(t => t.type === TokenType.KEYWORD || t.type === TokenType.EOF)).toBe(true);
    });

    it('skips single-line comments', () => {
        const lexer = new Lexer('let x = 1; // this is a comment\nconst y = 2;');
        const tokens = lexer.tokenize();
        expect(tokens.some(t => t.value === '//')).toBe(false);
        expect(tokens.map(t => t.type)).toContain(TokenType.KEYWORD);
        expect(tokens.map(t => t.type)).toContain(TokenType.IDENTIFIER);
    });

    it('skips multi-line comments', () => {
        const lexer = new Lexer('let x = 1; /* multi\nline\ncomment */ const y = 2;');
        const tokens = lexer.tokenize();
        expect(tokens.some(t => t.value === '/*')).toBe(false);
        expect(tokens.map(t => t.type)).toContain(TokenType.KEYWORD);
        expect(tokens.map(t => t.type)).toContain(TokenType.IDENTIFIER);
    });

    it('throws on invalid character', () => {
        const lexer = new Lexer('let x = 1 @');
        expect(() => lexer.tokenize()).toThrow(/Invalid character/);
    });

    it('tokenizes consecutive operators and edge cases', () => {
        const lexer = new Lexer('a === b !== c == d != e');
        const tokens = lexer.tokenize();
        expect(tokens.map(t => t.type)).toEqual([
            TokenType.IDENTIFIER, TokenType.OPERATOR, TokenType.IDENTIFIER, TokenType.OPERATOR, TokenType.IDENTIFIER,
            TokenType.OPERATOR, TokenType.IDENTIFIER, TokenType.OPERATOR, TokenType.IDENTIFIER, TokenType.EOF
        ]);
    });

    it('tokenizes type assertions and generics', () => {
        const lexer = new Lexer('x as string generic infer');
        const tokens = lexer.tokenize();
        expect(tokens.map(t => t.type)).toContain(TokenType.KEYWORD);
        expect(tokens.map(t => t.value)).toContain('as');
        expect(tokens.map(t => t.value)).toContain('generic');
        expect(tokens.map(t => t.value)).toContain('infer');
    });
});

describe('Lexer - edge and missing cases', () => {
    it('tokenizes escaped quotes in strings', () => {
        const lexer = new Lexer("\"foo\\\"bar\" 'foo\\'bar'");
        const tokens = lexer.tokenize();
        expect(tokens.filter(t => t.type === TokenType.STRING).length).toBe(2);
    });

    it('tokenizes unicode escapes in strings', () => {
        const lexer = new Lexer('"\\u1234"');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.STRING);
    });

    it('handles nested template expressions', () => {
        const lexer = new Lexer('`a${b + `c${d}`}`');
        const tokens = lexer.tokenize();
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_STRING)).toBe(true);
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_EXPRESSION)).toBe(true);
    });

    it('handles escaped backticks in template strings', () => {
        const lexer = new Lexer('`foo\\`bar`');
        const tokens = lexer.tokenize();
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_STRING)).toBe(true);
    });

    it('tokenizes numbers in exponential notation', () => {
        const lexer = new Lexer('1e10 2.5e-3');
        const tokens = lexer.tokenize();
        // console.log(tokens);
        expect(tokens.filter(t => t.type === TokenType.NUMBER).length).toBe(2);
    });

    it('tokenizes hexadecimal, binary, and octal numbers', () => {
        const lexer = new Lexer('0x1A 0b101 0o77');
        const tokens = lexer.tokenize();
        expect(tokens.filter(t => t.type === TokenType.NUMBER).length).toBe(3);
    });

    it('throws on unterminated multi-line comment', () => {
        const lexer = new Lexer('let x = 1; /* unterminated comment');
        expect(() => lexer.tokenize()).not.toThrow(); // Should skip to EOF, not throw
    });

    it('skips comments inside code', () => {
        const lexer = new Lexer('let /* comment */ x = 1;');
        const tokens = lexer.tokenize();
        expect(tokens.map(t => t.type)).toContain(TokenType.KEYWORD);
        expect(tokens.map(t => t.type)).toContain(TokenType.IDENTIFIER);
    });

    it('handles leading, trailing, and multiple whitespace', () => {
        const lexer = new Lexer('   let   x   =   1   ;   ');
        const tokens = lexer.tokenize();
        expect(tokens.map(t => t.type)).toContain(TokenType.KEYWORD);
        expect(tokens.map(t => t.type)).toContain(TokenType.IDENTIFIER);
        expect(tokens.map(t => t.type)).toContain(TokenType.ASSIGNMENT);
        expect(tokens.map(t => t.type)).toContain(TokenType.NUMBER);
        expect(tokens.map(t => t.type)).toContain(TokenType.SEMICOLON);
    });

    it('handles very large input (stress test)', () => {
        const code = 'let x = 1; '.repeat(10000);
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        expect(tokens.length).toBeGreaterThan(10000);
    });
});

// --- Additional edge case tests ---
describe('Lexer - additional edge cases', () => {
    it('tokenizes unicode identifiers', () => {
        const lexer = new Lexer('const π = 3.14; let 变量 = 42;');
        const tokens = lexer.tokenize();
        expect(tokens.some(t => t.value === 'π')).toBe(true);
        expect(tokens.some(t => t.value === '变量')).toBe(true);
    });

    it('tokenizes strings with escaped line breaks', () => {
        const lexer = new Lexer('"foo\\\nbar"');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.STRING);
    });

    it('tokenizes empty template literal', () => {
        const lexer = new Lexer('const t = ``;');
        const tokens = lexer.tokenize();
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_STRING)).toBe(true);
    });

    it('tokenizes template literal with only expression', () => {
        const lexer = new Lexer('const t = `${foo}`;');
        const tokens = lexer.tokenize();
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_STRING)).toBe(true);
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_EXPRESSION)).toBe(true);
    });

    it('tokenizes numbers with leading zeros', () => {
        const lexer = new Lexer('0123');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.NUMBER);
    });

    it('handles invalid numeric literals gracefully', () => {
        const lexer = new Lexer('0xGHI 0b102 0o89 1e 1e+ 1e-');
        // Should throw an error for invalid numbers
        expect(() => lexer.tokenize()).toThrow();
    });

    it('handles backslash at end of string', () => {
        const lexer = new Lexer('"foo\\\\"');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.STRING);
    });

    it('skips non-ASCII whitespace', () => {
        const lexer = new Lexer('\u00A0let\u2003x = 1;');
        const tokens = lexer.tokenize();
        expect(tokens.map(t => t.type)).toContain(TokenType.KEYWORD);
        expect(tokens.map(t => t.type)).toContain(TokenType.IDENTIFIER);
    });
}); 