const Lexer = require('./lexer');
const TokenType = require('./libs/token-types');

// --- Helpers ---
function getTokenTypes(code) {
    const lexer = new Lexer(code);
    return lexer.tokenize().map(t => t.type);
}
function getTokenValues(code) {
    const lexer = new Lexer(code);
    return lexer.tokenize().map(t => t.value);
}
function getTokens(code) {
    const lexer = new Lexer(code);
    return lexer.tokenize();
}

// --- Tests ---
describe('Lexer - Basic Tokenization', () => {
    test('identifiers and keywords', () => {
        expect(getTokenTypes('let x = 42;')).toEqual([
            TokenType.KEYWORD, TokenType.IDENTIFIER, TokenType.ASSIGNMENT, TokenType.NUMBER, TokenType.SEMICOLON, TokenType.EOF
        ]);
    });

    test('template literals', () => {
        const tokens = getTokens('const s = `hello ${name}`;');
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_STRING)).toBe(true);
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_EXPRESSION)).toBe(true);
    });

    test('optional chaining and nullish coalescing', () => {
        const types = getTokenTypes('a?.b ?? c;');
        expect(types).toContain(TokenType.OPTIONAL_CHAINING);
        expect(types).toContain(TokenType.NULLISH_COALESCING);
    });

    test('union and intersection types', () => {
        const types = getTokenTypes('let x: string | number & boolean;');
        expect(types).toContain(TokenType.UNION);
        expect(types).toContain(TokenType.INTERSECTION);
    });

    test('throws on unterminated string', () => {
        expect(() => getTokens('let s = "unterminated;')).toThrow(/Unterminated string/);
    });

    test('throws on unterminated template string', () => {
        expect(() => getTokens('let s = `unterminated;')).toThrow(/Unterminated template string/);
    });
});

describe('Lexer - Brackets, Punctuation, Operators', () => {
    test('all bracket types', () => {
        expect(getTokenTypes('() {} [] <>')).toEqual([
            TokenType.LEFT_PAREN, TokenType.RIGHT_PAREN,
            TokenType.LEFT_BRACE, TokenType.RIGHT_BRACE,
            TokenType.LEFT_BRACKET, TokenType.RIGHT_BRACKET,
            TokenType.LEFT_ANGLE, TokenType.RIGHT_ANGLE,
            TokenType.EOF
        ]);
    });

    test('all punctuation', () => {
        expect(getTokenTypes('; , . : ?')).toEqual([
            TokenType.SEMICOLON, TokenType.COMMA, TokenType.DOT, TokenType.COLON, TokenType.QUESTION_MARK, TokenType.EOF
        ]);
    });

    test('all basic operators', () => {
        expect(getTokenTypes('+ - * / % ! = == === != !== || && | &')).toEqual([
            TokenType.OPERATOR, TokenType.OPERATOR, TokenType.OPERATOR, TokenType.OPERATOR, TokenType.OPERATOR, TokenType.OPERATOR,
            TokenType.ASSIGNMENT, TokenType.OPERATOR, TokenType.OPERATOR, TokenType.OPERATOR, TokenType.OPERATOR,
            TokenType.OPERATOR, TokenType.OPERATOR, TokenType.UNION, TokenType.INTERSECTION, TokenType.EOF
        ]);
    });
});

describe('Lexer - Literals and Numbers', () => {
    test('all literal types', () => {
        expect(getTokenTypes('true false null undefined NaN Infinity')).toEqual([
            TokenType.KEYWORD, TokenType.KEYWORD, TokenType.KEYWORD, TokenType.KEYWORD, TokenType.KEYWORD, TokenType.KEYWORD, TokenType.EOF
        ]);
    });

    test('numbers (integers and floats)', () => {
        expect(getTokenTypes('123 45.67 0.89 .5 6.')).toEqual([
            TokenType.NUMBER, TokenType.NUMBER, TokenType.NUMBER, TokenType.NUMBER, TokenType.NUMBER, TokenType.EOF
        ]);
    });

    test('numbers in exponential notation', () => {
        const tokens = getTokens('1e10 2.5e-3');
        expect(tokens.filter(t => t.type === TokenType.NUMBER).length).toBe(2);
    });

    test('hexadecimal, binary, and octal numbers', () => {
        const tokens = getTokens('0x1A 0b101 0o77');
        expect(tokens.filter(t => t.type === TokenType.NUMBER).length).toBe(3);
    });

    test('numbers with leading zeros', () => {
        const tokens = getTokens('0123');
        expect(tokens[0].type).toBe(TokenType.NUMBER);
    });

    test('invalid numeric literals throw', () => {
        expect(() => getTokens('0xGHI 0b102 0o89 1e 1e+ 1e-')).toThrow();
    });
});

describe('Lexer - Keywords and Identifiers', () => {
    test('all keyword categories', () => {
        const code = [
            'let', 'if', 'immutable', 'requires', 'try', 'doc', 'string', 'import', 'this', 'in', 'with'
        ].join(' ');
        const tokens = getTokens(code);
        expect(tokens.every(t => t.type === TokenType.KEYWORD || t.type === TokenType.EOF)).toBe(true);
    });

    test('unicode identifiers', () => {
        const tokens = getTokens('const π = 3.14; let 变量 = 42;');
        expect(tokens.some(t => t.value === 'π')).toBe(true);
        expect(tokens.some(t => t.value === '变量')).toBe(true);
    });
});

describe('Lexer - Comments and Whitespace', () => {
    test('skips single-line comments', () => {
        const tokens = getTokens('let x = 1; // this is a comment\nconst y = 2;');
        expect(tokens.some(t => t.value === '//')).toBe(false);
        expect(tokens.map(t => t.type)).toContain(TokenType.KEYWORD);
        expect(tokens.map(t => t.type)).toContain(TokenType.IDENTIFIER);
    });

    test('skips multi-line comments', () => {
        const tokens = getTokens('let x = 1; /* multi\nline\ncomment */ const y = 2;');
        expect(tokens.some(t => t.value === '/*')).toBe(false);
        expect(tokens.map(t => t.type)).toContain(TokenType.KEYWORD);
        expect(tokens.map(t => t.type)).toContain(TokenType.IDENTIFIER);
    });

    test('unterminated multi-line comment does not throw', () => {
        expect(() => getTokens('let x = 1; /* unterminated comment')).not.toThrow();
    });

    test('skips comments inside code', () => {
        const tokens = getTokens('let /* comment */ x = 1;');
        expect(tokens.map(t => t.type)).toContain(TokenType.KEYWORD);
        expect(tokens.map(t => t.type)).toContain(TokenType.IDENTIFIER);
    });

    test('skips non-ASCII whitespace', () => {
        const tokens = getTokens('\u00A0let\u2003x = 1;');
        expect(tokens.map(t => t.type)).toContain(TokenType.KEYWORD);
        expect(tokens.map(t => t.type)).toContain(TokenType.IDENTIFIER);
    });

    test('handles leading, trailing, and multiple whitespace', () => {
        const tokens = getTokens('   let   x   =   1   ;   ');
        expect(tokens.map(t => t.type)).toContain(TokenType.KEYWORD);
        expect(tokens.map(t => t.type)).toContain(TokenType.IDENTIFIER);
        expect(tokens.map(t => t.type)).toContain(TokenType.ASSIGNMENT);
        expect(tokens.map(t => t.type)).toContain(TokenType.NUMBER);
        expect(tokens.map(t => t.type)).toContain(TokenType.SEMICOLON);
    });
});

describe('Lexer - Strings and Templates', () => {
    test('escaped quotes in strings', () => {
        const tokens = getTokens("\"foo\\\"bar\" 'foo\\'bar'");
        expect(tokens.filter(t => t.type === TokenType.STRING).length).toBe(2);
    });

    test('unicode escapes in strings', () => {
        const tokens = getTokens('"\\u1234"');
        expect(tokens[0].type).toBe(TokenType.STRING);
    });

    test('strings with escaped line breaks', () => {
        const tokens = getTokens('"foo\\\nbar"');
        expect(tokens[0].type).toBe(TokenType.STRING);
    });

    test('backslash at end of string', () => {
        const tokens = getTokens('"foo\\\\"');
        expect(tokens[0].type).toBe(TokenType.STRING);
    });

    test('empty template literal', () => {
        const tokens = getTokens('const t = ``;');
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_STRING)).toBe(true);
    });

    test('template literal with only expression', () => {
        const tokens = getTokens('const t = `${foo}`;');
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_STRING)).toBe(true);
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_EXPRESSION)).toBe(true);
    });

    test('nested template expressions', () => {
        const tokens = getTokens('`a${b + `c${d}`}`');
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_STRING)).toBe(true);
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_EXPRESSION)).toBe(true);
    });

    test('escaped backticks in template strings', () => {
        const tokens = getTokens('`foo\\`bar`');
        expect(tokens.some(t => t.type === TokenType.TEMPLATE_STRING)).toBe(true);
    });
});

describe('Lexer - Edge Cases', () => {
    test('throws on invalid character', () => {
        expect(() => getTokens('let x = 1 @')).toThrow(/Invalid character/);
    });

    test('consecutive operators and edge cases', () => {
        expect(getTokenTypes('a === b !== c == d != e')).toEqual([
            TokenType.IDENTIFIER, TokenType.OPERATOR, TokenType.IDENTIFIER, TokenType.OPERATOR, TokenType.IDENTIFIER,
            TokenType.OPERATOR, TokenType.IDENTIFIER, TokenType.OPERATOR, TokenType.IDENTIFIER, TokenType.EOF
        ]);
    });

    test('type assertions and generics', () => {
        const tokens = getTokens('x as string generic infer');
        expect(tokens.map(t => t.type)).toContain(TokenType.KEYWORD);
        expect(tokens.map(t => t.value)).toContain('as');
        expect(tokens.map(t => t.value)).toContain('generic');
        expect(tokens.map(t => t.value)).toContain('infer');
    });

    test('very large input (stress test)', () => {
        const code = 'let x = 1; '.repeat(10000);
        const tokens = getTokens(code);
        expect(tokens.length).toBeGreaterThan(10000);
    });
});
