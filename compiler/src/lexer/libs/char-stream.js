// CharStream: handles advancing, peeking, and position tracking for the lexer

class CharStream {
    constructor(source) {
        this.source = source;
        this.position = 0;
        this.line = 1;
        this.column = 1;
        this.currentChar = this.source[0] || null;
    }

    advance() {
        if (this.currentChar === '\n') {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }
        this.position++;
        this.currentChar = this.position < this.source.length ? this.source[this.position] : null;
    }

    peek() {
        const peekPos = this.position + 1;
        return peekPos < this.source.length ? this.source[peekPos] : null;
    }
}

module.exports = CharStream; 