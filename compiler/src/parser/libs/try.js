// Try/catch/finally statement parsing helper for Parser

function parseTryStatement(parser) {
    parser.expect(parser.TokenType.KEYWORD, 'try');
    // Parse try block
    let block = null;
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        block = parser.parseBlockStatement();
    } else {
        block = { type: 'BlockStatement', body: [] };
    }
    // Parse catch clause
    let handler = null;
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'catch') {
        parser.advance();
        let param = null;
        if (parser.current.type === parser.TokenType.LEFT_PAREN) {
            parser.advance();
            if (parser.current.type === parser.TokenType.IDENTIFIER) {
                param = parser.current.value;
                parser.advance();
            }
            // Skip to RIGHT_PAREN
            while (parser.current.type !== parser.TokenType.RIGHT_PAREN && parser.current.type !== parser.TokenType.EOF) {
                parser.advance();
            }
            if (parser.current.type === parser.TokenType.RIGHT_PAREN) parser.advance();
        }
        // Parse catch block
        let catchBlock = null;
        if (parser.current.type === parser.TokenType.LEFT_BRACE) {
            catchBlock = parser.parseBlockStatement();
        } else {
            catchBlock = { type: 'BlockStatement', body: [] };
        }
        handler = { param, body: catchBlock };
    }
    // Parse finally block
    let finalizer = null;
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'finally') {
        parser.advance();
        let finallyBlock = null;
        if (parser.current.type === parser.TokenType.LEFT_BRACE) {
            finallyBlock = parser.parseBlockStatement();
        } else {
            finallyBlock = { type: 'BlockStatement', body: [] };
        }
        finalizer = finallyBlock;
    }
    return {
        type: 'TryStatement',
        block,
        handler,
        finalizer
    };
}

module.exports = {
    parseTryStatement
}; 