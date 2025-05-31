// Import/export statement parsing helper for Parser

function parseImportExport(parser) {
    while (
        parser.current.type !== parser.TokenType.SEMICOLON &&
        parser.current.type !== parser.TokenType.EOF
    ) {
        parser.advance();
    }
    if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
    return { type: 'ImportExportDeclaration', skipped: true };
}

module.exports = {
    parseImportExport
}; 