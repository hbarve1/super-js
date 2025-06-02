// Utility functions for the Parser class

function getCurrent(parser) {
    return parser.tokens[parser.position];
}

function peek(parser, offset = 1) {
    return parser.tokens[parser.position + offset] || { type: 'EOF' };
}

function advance(parser) {
    if (parser.position < parser.tokens.length - 1) {
        parser.position++;
    }
    return getCurrent(parser);
}

function expect(parser, type, value) {
    const current = getCurrent(parser);
    if (current.type !== type || (value !== undefined && current.value !== value)) {
        throw new Error(`Expected ${type}${value ? ' ' + value : ''} but got ${current.type} ${current.value}`);
    }
    const token = current;
    advance(parser);
    return token;
}

module.exports = {
    getCurrent,
    peek,
    advance,
    expect
};
