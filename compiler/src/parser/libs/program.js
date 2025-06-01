// Program parsing helper for Parser

const { EXPRESSION_STATEMENT, PROGRAM } = require('../../utils/ast-node-types');

function parseProgram(parser) {
    // Parse as many statements as possible
    const body = [];
    while (parser.current.type !== parser.TokenType.EOF) {
        try {
            const stmt = parser.parseStatement();
            if (Array.isArray(stmt)) {
                body.push(...stmt);
            } else if (stmt) {
                body.push(stmt);
            }
        } catch (e) {
            // Error recovery: add a stub node to AST
            body.push({ type: EXPRESSION_STATEMENT, skipped: true, error: e.message });
            // Skip to next semicolon or block end
            while (
                parser.current.type !== parser.TokenType.SEMICOLON &&
                parser.current.type !== parser.TokenType.RIGHT_BRACE &&
                parser.current.type !== parser.TokenType.EOF
            ) {
                parser.advance();
            }
            // Only advance if at semicolon or right brace
            if (parser.current.type === parser.TokenType.SEMICOLON || parser.current.type === parser.TokenType.RIGHT_BRACE) {
                parser.advance();
            } else if (parser.current.type !== parser.TokenType.EOF) {
                // If not at a recovery point, advance one token to avoid infinite loop
                parser.advance();
            }
        }
        // No unconditional advance here!
    }
    return { type: PROGRAM, body };
}

module.exports = {
    parseProgram
}; 