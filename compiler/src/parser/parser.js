const TokenType = require('../lexer/libs/token-types');

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.position = 0;
    }

    get current() {
        return this.tokens[this.position];
    }

    advance() {
        if (this.position < this.tokens.length - 1) {
            this.position++;
        }
        return this.current;
    }

    expect(type, value) {
        if (this.current.type !== type || (value !== undefined && this.current.value !== value)) {
            throw new Error(`Expected ${type}${value ? ' ' + value : ''} but got ${this.current.type} ${this.current.value}`);
        }
        const token = this.current;
        this.advance();
        return token;
    }

    parse() {
        // For now, just parse a single variable declaration
        return this.parseVariableDeclaration();
    }

    parseVariableDeclaration() {
        // let|const|var IDENTIFIER [: TYPE] [= expr] ;
        if (
            this.current.type !== TokenType.KEYWORD ||
            !['let', 'const', 'var'].includes(this.current.value)
        ) {
            throw new Error('Expected variable declaration keyword');
        }
        const kindToken = this.current;
        this.advance();
        const idToken = this.expect(TokenType.IDENTIFIER);
        let varType = null;
        if (this.current.type === TokenType.COLON) {
            this.advance();
            if (this.current.type === TokenType.KEYWORD || this.current.type === TokenType.IDENTIFIER) {
                varType = this.current.value;
                this.advance();
            } else {
                throw new Error('Expected type after colon');
            }
        }
        let init = null;
        if (this.current.type === TokenType.ASSIGNMENT) {
            this.advance();
            // --- FIX: assign init before advancing ---
            if (this.current.type === TokenType.NUMBER || this.current.type === TokenType.STRING) {
                init = this.current.value;
                this.advance();
            } else if (
                this.current.type === TokenType.KEYWORD &&
                ['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'].includes(this.current.value)
            ) {
                switch (this.current.value) {
                    case 'true': init = true; break;
                    case 'false': init = false; break;
                    case 'null': init = null; break;
                    case 'undefined': init = undefined; break;
                    case 'NaN': init = NaN; break;
                    case 'Infinity': init = Infinity; break;
                }
                this.advance();
            } else {
                throw new Error('Expected literal initializer');
            }
        }
        this.expect(TokenType.SEMICOLON);
        return {
            type: 'VariableDeclaration',
            kind: kindToken.value,
            id: idToken.value,
            varType,
            init
        };
    }
}

module.exports = Parser; 
