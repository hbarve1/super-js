// Control flow statement parsing helper for Parser

const { CONTROL_FLOW_STATEMENT } = require('../../utils/ast-node-types');

function parseControlFlow(parser) {
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'if') {
        return parser.parseIfStatement();
    }
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'for') {
        return parser.parseForStatement();
    }
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'while') {
        return parser.parseWhileStatement();
    }
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'do') {
        return parser.parseDoWhileStatement();
    }
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'switch') {
        return parser.parseSwitchStatement();
    }
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'try') {
        return parser.parseTryStatement();
    }
    // For now, fallback to stub for other control flow
    while (
        parser.current.type !== parser.TokenType.RIGHT_BRACE &&
        parser.current.type !== parser.TokenType.SEMICOLON &&
        parser.current.type !== parser.TokenType.EOF
    ) {
        parser.advance();
    }
    if (parser.current.type === parser.TokenType.RIGHT_BRACE || parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
    return { type: CONTROL_FLOW_STATEMENT, skipped: true };
}

module.exports = {
    parseControlFlow
}; 