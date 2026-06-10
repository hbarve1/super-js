// Template literal helpers for the lexer

function readTemplateStringSegment(lexer) {
    // Reads until ${ or `, returns the string segment (may be empty)
    let result = '';
    const startColumn = lexer.column;
    while (lexer.currentChar && lexer.currentChar !== '`') {
        if (lexer.currentChar === '\\') {
            lexer.advance();
            switch (lexer.currentChar) {
                case 'n': result += '\n'; break;
                case 't': result += '\t'; break;
                case 'r': result += '\r'; break;
                case '`': result += '`'; break;
                case '$': result += '$'; break;
                case '\\': result += '\\'; break;
                default: result += lexer.currentChar;
            }
        } else if (lexer.currentChar === '$' && lexer.peek() === '{') {
            // End of this segment, but not end of template
            break;
        } else {
            result += lexer.currentChar;
        }
        lexer.advance();
    }
    return { value: result, startColumn };
}

module.exports = {
    readTemplateStringSegment
}; 