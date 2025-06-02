
function parseExport(parser) {
    // Parse export statement (export ...)
    while (
        parser.current.type !== parser.TokenType.SEMICOLON &&
        parser.current.type !== parser.TokenType.EOF
    ) {
        parser.advance();
    }
    if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
    return { type: 'ExportDeclaration', skipped: true };
}

module.exports = {
    parseExport
};
