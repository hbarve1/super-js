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
        return new Token(TokenType.NUMBER, parseInt(result, 16), lexer.line, startColumn);
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
        return new Token(TokenType.NUMBER, parseInt(result, 2), lexer.line, startColumn);
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
        return new Token(TokenType.NUMBER, parseInt(result, 8), lexer.line, startColumn);
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
    return new Token(TokenType.NUMBER, parseFloat(result), lexer.line, startColumn);
}

module.exports = { readNumber }; 