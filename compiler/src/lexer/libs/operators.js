// Operator and punctuation helpers for the lexer

const OPERATORS = [
    '===', '!==', '==', '!=', '&&', '||', '?.', '??',
    '=', '+', '-', '*', '/', '%', '!', '|', '&', '<', '>',
];

const PUNCTUATORS = [
    ';', ',', '.', ':', '?', '(', ')', '{', '}', '[', ']',
];

function matchOperatorOrPunctuator(lexer) {
    // Try to match the longest operator or punctuator at the current position
    const candidates = [...OPERATORS, ...PUNCTUATORS].sort((a, b) => b.length - a.length);
    for (const op of candidates) {
        if (lexer.source.startsWith(op, lexer.position)) {
            return op;
        }
    }
    return null;
}

module.exports = {
    OPERATORS,
    PUNCTUATORS,
    matchOperatorOrPunctuator
}; 