// Import/export statement parsing helper for Parser

function parseImport(parser) {
    // Parse import statement (import ... from ...)
    while (
        parser.current.type !== parser.TokenType.SEMICOLON &&
        parser.current.type !== parser.TokenType.EOF
    ) {
        parser.advance();
    }
    if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
    return { type: 'ImportDeclaration', skipped: true };
}

module.exports = {
    parseImport
};
