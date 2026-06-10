class Token {
    constructor(type, value, line, column) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.column = column;
    }

    toString() {
        return `Token(${this.type}, ${this.value}, line=${this.line}, col=${this.column})`;
    }
}

module.exports = Token; 
