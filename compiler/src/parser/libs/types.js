// Type declaration parsing helper for Parser

function parseTypeDeclaration(parser) {
    // type|interface|enum|namespace NAME ...
    const kind = parser.current.value;
    parser.advance();
    const idToken = parser.expect(parser.TokenType.IDENTIFIER);
    // For now, just skip to the next block or semicolon and stub the body
    let body = [];
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        // Skip block
        parser.advance();
        let braceDepth = 1;
        while (braceDepth > 0 && parser.current.type !== parser.TokenType.EOF) {
            if (parser.current.type === parser.TokenType.LEFT_BRACE) braceDepth++;
            if (parser.current.type === parser.TokenType.RIGHT_BRACE) braceDepth--;
            parser.advance();
        }
    } else {
        // Skip until semicolon
        while (parser.current.type !== parser.TokenType.SEMICOLON && parser.current.type !== parser.TokenType.EOF) {
            parser.advance();
        }
        if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
    }
    let nodeType = 'TypeDeclaration';
    if (kind === 'interface') nodeType = 'InterfaceDeclaration';
    if (kind === 'enum') nodeType = 'EnumDeclaration';
    if (kind === 'namespace') nodeType = 'NamespaceDeclaration';
    return {
        type: nodeType,
        kind,
        id: idToken.value,
        body
    };
}

module.exports = {
    parseTypeDeclaration
}; 