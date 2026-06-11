// Number literal parsing helper for the lexer
const TokenType = require('./token-types');
const Token = require('./token');

function readNumber(lexer) {
    const startColumn = lexer.column;
    let result = '';

    // Hexadecimal
    if (lexer.currentChar === '0' && (lexer.peek() === 'x' || lexer.peek() === 'X')) {
        result += lexer.currentChar;
        lexer.advance();
        result += lexer.currentChar;
        lexer.advance();
        while (lexer.currentChar && /[0-9a-fA-F]/.test(lexer.currentChar)) {
            result += lexer.currentChar;
            lexer.advance();
        }
        const value = parseInt(result, 16);
        if (isNaN(value)) {
            return new Token(TokenType.ERROR, 'Invalid number literal', lexer.line, startColumn);
        }
        return new Token(TokenType.NUMBER, value, lexer.line, startColumn);
    }
    // Binary
    if (lexer.currentChar === '0' && (lexer.peek() === 'b' || lexer.peek() === 'B')) {
        result += lexer.currentChar;
        lexer.advance();
        result += lexer.currentChar;
        lexer.advance();
        while (lexer.currentChar && /[01]/.test(lexer.currentChar)) {
            result += lexer.currentChar;
            lexer.advance();
        }
        const value = parseInt(result.slice(2), 2);
        if (isNaN(value)) {
            return new Token(TokenType.ERROR, 'Invalid number literal', lexer.line, startColumn);
        }
        return new Token(TokenType.NUMBER, value, lexer.line, startColumn);
    }
    // Octal
    if (lexer.currentChar === '0' && (lexer.peek() === 'o' || lexer.peek() === 'O')) {
        result += lexer.currentChar;
        lexer.advance();
        result += lexer.currentChar;
        lexer.advance();
        while (lexer.currentChar && /[0-7]/.test(lexer.currentChar)) {
            result += lexer.currentChar;
            lexer.advance();
        }
        const value = parseInt(result.slice(2), 8);
        if (isNaN(value)) {
            return new Token(TokenType.ERROR, 'Invalid number literal', lexer.line, startColumn);
        }
        return new Token(TokenType.NUMBER, value, lexer.line, startColumn);
    }

    // Manual parse for decimal, float, exponent
    // Integer part (or leading dot)
    let sawDigit = false;
    if (lexer.currentChar === '.') {
        result += lexer.currentChar;
        lexer.advance();
        while (lexer.currentChar && /[0-9]/.test(lexer.currentChar)) {
            result += lexer.currentChar;
            lexer.advance();
            sawDigit = true;
        }
    } else {
        while (lexer.currentChar && /[0-9]/.test(lexer.currentChar)) {
            result += lexer.currentChar;
            lexer.advance();
            sawDigit = true;
        }
        if (lexer.currentChar === '.') {
            result += lexer.currentChar;
            lexer.advance();
            while (lexer.currentChar && /[0-9]/.test(lexer.currentChar)) {
                result += lexer.currentChar;
                lexer.advance();
                sawDigit = true;
            }
        }
    }
    // Exponent part
    if (sawDigit && lexer.currentChar && (lexer.currentChar === 'e' || lexer.currentChar === 'E')) {
        result += lexer.currentChar;
        lexer.advance();
        if (lexer.currentChar === '+' || lexer.currentChar === '-') {
            result += lexer.currentChar;
            lexer.advance();
        }
        let expDigits = false;
        while (lexer.currentChar && /[0-9]/.test(lexer.currentChar)) {
            result += lexer.currentChar;
            lexer.advance();
            expDigits = true;
        }
        // Only include exponent if there are digits after e/E
        if (!expDigits) {
            // Remove the exponent part if no digits
            result = result.replace(/[eE][+-]?$/, '');
        }
    }
    const value = parseFloat(result);
    if (isNaN(value)) {
        return new Token(TokenType.ERROR, 'Invalid number literal', lexer.line, startColumn);
    }
    return new Token(TokenType.NUMBER, value, lexer.line, startColumn);
}

module.exports = { readNumber }; 