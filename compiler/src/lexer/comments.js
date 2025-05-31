// Comment skipping helper for the lexer
function skipComment(lexer) {
    if (lexer.currentChar === '/' && lexer.peek() === '/') {
        while (lexer.currentChar && lexer.currentChar !== '\n') {
            lexer.advance();
        }
    } else if (lexer.currentChar === '/' && lexer.peek() === '*') {
        lexer.advance(); // Skip /
        lexer.advance(); // Skip *
        while (lexer.currentChar && !(lexer.currentChar === '*' && lexer.peek() === '/')) {
            lexer.advance();
        }
        if (lexer.currentChar) {
            lexer.advance(); // Skip *
            lexer.advance(); // Skip /
        }
    }
}

module.exports = { skipComment }; 