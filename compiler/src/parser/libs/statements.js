// Statement parsing helper for Parser

function parseStatement(parser) {
    if (parser.current.type === parser.TokenType.LEFT_BRACE) {
        return parser.parseBlockStatement();
    }
    if (parser.current.type === parser.TokenType.KEYWORD) {
        switch (parser.current.value) {
            case 'let':
            case 'const':
            case 'var':
                return parser.parseVariableDeclaration();
            case 'function':
                return parser.parseFunctionDeclaration();
            case 'class':
                return parser.parseClassDeclaration();
            case 'import':
            case 'export':
                return parser.parseImportExport();
            case 'type':
            case 'interface':
            case 'enum':
            case 'namespace':
                return parser.parseTypeDeclaration();
            case 'if':
            case 'for':
            case 'while':
            case 'do':
            case 'switch':
            case 'try':
            case 'with':
                return parser.parseControlFlow();
            case 'return': {
                parser.advance();
                let argument = null;
                if (parser.current.type !== parser.TokenType.SEMICOLON && parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF) {
                    argument = parser.parseExpression();
                }
                if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
                return { type: 'ReturnStatement', argument };
            }
            case 'break': {
                parser.advance();
                if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
                return { type: 'BreakStatement' };
            }
            case 'continue': {
                parser.advance();
                if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
                return { type: 'ContinueStatement' };
            }
            case 'throw': {
                parser.advance();
                let argument = null;
                if (parser.current.type !== parser.TokenType.SEMICOLON && parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF) {
                    argument = parser.parseExpression();
                }
                if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
                return { type: 'ThrowStatement', argument };
            }
            default:
                return parser.parseExpressionStatement();
        }
    }
    // Fallback: parse as expression statement
    return parser.parseExpressionStatement();
}

module.exports = {
    parseStatement
}; 