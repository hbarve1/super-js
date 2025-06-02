// Statement parsing helper for Parser

const { RETURN_STATEMENT, BREAK_STATEMENT, CONTINUE_STATEMENT, THROW_STATEMENT, EXPRESSION_STATEMENT } = require('../../utils/ast-node-types');

function parseStatement(parser) {
    // Support top-level 'async function' as a function declaration
    if (
        parser.current.type === parser.TokenType.KEYWORD &&
        parser.current.value === 'async' &&
        parser.peek().type === parser.TokenType.KEYWORD &&
        parser.peek().value === 'function'
    ) {
        // Let parseFunctionDeclaration handle 'async function ...'
        return parser.parseFunctionDeclaration();
    }
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
                return parser.parseImport();
            case 'export':
                return parser.parseExport();
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
                return { type: RETURN_STATEMENT, argument };
            }
            case 'break': {
                parser.advance();
                if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
                return { type: BREAK_STATEMENT };
            }
            case 'continue': {
                parser.advance();
                if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
                return { type: CONTINUE_STATEMENT };
            }
            case 'throw': {
                parser.advance();
                let argument = null;
                if (parser.current.type !== parser.TokenType.SEMICOLON && parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF) {
                    argument = parser.parseExpression();
                }
                if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
                return { type: THROW_STATEMENT, argument };
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