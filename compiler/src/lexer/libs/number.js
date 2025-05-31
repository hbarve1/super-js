// Number literal parsing helper for the lexer
const TokenType = require('./token-types');
const Token = require('./token');

function readNumber(lexer) {
    let result = '';
    const startColumn = lexer.column;
    let hasDecimal = false;

    // Allow numbers starting with a dot
    if (lexer.currentChar === '.') {
        hasDecimal = true;
        result += '.';
        lexer.advance();
    }

    while (lexer.currentChar && /[0-9]/.test(lexer.currentChar)) {
        result += lexer.currentChar;
        lexer.advance();
    }

    // Allow numbers with a decimal point (e.g., 6.)
    if (lexer.currentChar === '.' && !hasDecimal) {
        hasDecimal = true;
        result += '.';
        lexer.advance();
        while (lexer.currentChar && /[0-9]/.test(lexer.currentChar)) {
            result += lexer.currentChar;
            lexer.advance();
        }
    }

    return new Token(TokenType.NUMBER, parseFloat(result), lexer.line, startColumn);
}

module.exports = { readNumber }; 