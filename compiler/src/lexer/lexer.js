const Token = require('./token');
const TokenType = require('./token-types');
const { allKeywords } = require('../keywords');

class Lexer {
    constructor(source) {
        this.source = source;
        this.position = 0;
        this.line = 1;
        this.column = 1;
        this.currentChar = this.source[0];
        this._templateStack = [];
        this._templateBuffer = '';
        this._inTemplate = false;
    }

    advance() {
        this.position++;
        this.column++;
        this.currentChar = this.position < this.source.length ? this.source[this.position] : null;
    }

    peek() {
        const peekPos = this.position + 1;
        return peekPos < this.source.length ? this.source[peekPos] : null;
    }

    skipWhitespace() {
        while (this.currentChar && /\s/.test(this.currentChar)) {
            if (this.currentChar === '\n') {
                this.line++;
                this.column = 1;
            }
            this.advance();
        }
    }

    skipComment() {
        if (this.currentChar === '/' && this.peek() === '/') {
            while (this.currentChar && this.currentChar !== '\n') {
                this.advance();
            }
        } else if (this.currentChar === '/' && this.peek() === '*') {
            this.advance(); // Skip /
            this.advance(); // Skip *
            while (this.currentChar && !(this.currentChar === '*' && this.peek() === '/')) {
                if (this.currentChar === '\n') {
                    this.line++;
                    this.column = 1;
                }
                this.advance();
            }
            if (this.currentChar) {
                this.advance(); // Skip *
                this.advance(); // Skip /
            }
        }
    }

    readIdentifier() {
        let result = '';
        const startColumn = this.column;

        while (this.currentChar && /[a-zA-Z0-9_]/.test(this.currentChar)) {
            result += this.currentChar;
            this.advance();
        }

        // Check if it's a keyword
        if (allKeywords.includes(result)) {
            return new Token(TokenType.KEYWORD, result, this.line, startColumn);
        }

        return new Token(TokenType.IDENTIFIER, result, this.line, startColumn);
    }

    readNumber() {
        let result = '';
        const startColumn = this.column;
        let hasDecimal = false;

        // Allow numbers starting with a dot
        if (this.currentChar === '.') {
            hasDecimal = true;
            result += '.';
            this.advance();
        }

        while (this.currentChar && /[0-9]/.test(this.currentChar)) {
            result += this.currentChar;
            this.advance();
        }

        // Allow numbers with a decimal point (e.g., 6.)
        if (this.currentChar === '.' && !hasDecimal) {
            hasDecimal = true;
            result += '.';
            this.advance();
            while (this.currentChar && /[0-9]/.test(this.currentChar)) {
                result += this.currentChar;
                this.advance();
            }
        }

        return new Token(TokenType.NUMBER, parseFloat(result), this.line, startColumn);
    }

    readString() {
        const quote = this.currentChar;
        let result = '';
        const startColumn = this.column;
        this.advance();

        while (this.currentChar && this.currentChar !== quote) {
            if (this.currentChar === '\\') {
                this.advance();
                switch (this.currentChar) {
                    case 'n': result += '\n'; break;
                    case 't': result += '\t'; break;
                    case 'r': result += '\r'; break;
                    default: result += this.currentChar;
                }
            } else {
                result += this.currentChar;
            }
            this.advance();
        }

        if (this.currentChar === quote) {
            this.advance();
            return new Token(TokenType.STRING, result, this.line, startColumn);
        }

        return new Token(TokenType.ERROR, 'Unterminated string', this.line, startColumn);
    }

    readTemplateStringSegment() {
        // Reads until ${ or `, returns the string segment (may be empty)
        let result = '';
        const startColumn = this.column;
        while (this.currentChar && this.currentChar !== '`') {
            if (this.currentChar === '\\') {
                this.advance();
                switch (this.currentChar) {
                    case 'n': result += '\n'; break;
                    case 't': result += '\t'; break;
                    case 'r': result += '\r'; break;
                    case '`': result += '`'; break;
                    case '$': result += '$'; break;
                    case '\\': result += '\\'; break;
                    default: result += this.currentChar;
                }
            } else if (this.currentChar === '$' && this.peek() === '{') {
                // End of this segment, but not end of template
                break;
            } else {
                result += this.currentChar;
            }
            this.advance();
        }
        return { value: result, startColumn };
    }

    getNextToken() {
        // Handle template mode
        if (this._inTemplate) {
            // If we just finished a template expression, resume template string
            if (this.currentChar === '}') {
                this.advance();
                // Resume template string segment
            }
            // If at end of template
            if (this.currentChar === '`') {
                this.advance();
                this._inTemplate = false;
                return new Token(TokenType.TEMPLATE_STRING, this._templateBuffer, this.line, this.column - 1);
            }
            // If at start of embedded expression
            if (this.currentChar === '$' && this.peek() === '{') {
                // Emit the string segment so far
                const segment = this._templateBuffer;
                this._templateBuffer = '';
                this.advance(); // Skip $
                this.advance(); // Skip {
                // Stay in template mode, but let parser know to parse an expression
                return new Token(TokenType.TEMPLATE_EXPRESSION, segment, this.line, this.column - 2);
            }
            // Otherwise, read until next ${ or `
            const { value, startColumn } = this.readTemplateStringSegment();
            this._templateBuffer += value;
            // If we stopped at ${, emit the string segment (next call will emit TEMPLATE_EXPRESSION)
            if (this.currentChar === '$' && this.peek() === '{') {
                // Do not advance here, handled above
                const segment = this._templateBuffer;
                this._templateBuffer = '';
                return new Token(TokenType.TEMPLATE_STRING, segment, this.line, startColumn);
            }
            // If we stopped at `, emit the string segment (next call will emit TEMPLATE_STRING and exit template mode)
            if (this.currentChar === '`') {
                // Do not advance here, handled above
                const segment = this._templateBuffer;
                this._templateBuffer = '';
                return new Token(TokenType.TEMPLATE_STRING, segment, this.line, startColumn);
            }
            // If we hit EOF
            if (!this.currentChar) {
                this._inTemplate = false;
                return new Token(TokenType.ERROR, 'Unterminated template string', this.line, this.column);
            }
        }

        while (this.currentChar) {
            // Skip whitespace
            if (/\s/.test(this.currentChar)) {
                this.skipWhitespace();
                continue;
            }

            // Skip comments
            if (this.currentChar === '/' && (this.peek() === '/' || this.peek() === '*')) {
                this.skipComment();
                continue;
            }

            // Identifiers and keywords
            if (/[a-zA-Z_]/.test(this.currentChar)) {
                return this.readIdentifier();
            }

            // Numbers (including .5, 6.)
            if (/[0-9]/.test(this.currentChar) || (this.currentChar === '.' && /[0-9]/.test(this.peek()))) {
                return this.readNumber();
            }

            // Strings
            if (this.currentChar === '"' || this.currentChar === "'") {
                return this.readString();
            }
            // Template literals
            if (this.currentChar === '`') {
                this.advance();
                this._inTemplate = true;
                this._templateBuffer = '';
                // Start reading the first segment
                const { value, startColumn } = this.readTemplateStringSegment();
                this._templateBuffer += value;
                // If we stopped at ${, emit the string segment (next call will emit TEMPLATE_EXPRESSION)
                if (this.currentChar === '$' && this.peek() === '{') {
                    const segment = this._templateBuffer;
                    this._templateBuffer = '';
                    return new Token(TokenType.TEMPLATE_STRING, segment, this.line, startColumn);
                }
                // If we stopped at `, emit the string segment (next call will emit TEMPLATE_STRING and exit template mode)
                if (this.currentChar === '`') {
                    const segment = this._templateBuffer;
                    this._templateBuffer = '';
                    this._inTemplate = false;
                    this.advance();
                    return new Token(TokenType.TEMPLATE_STRING, segment, this.line, startColumn);
                }
                // If we hit EOF
                if (!this.currentChar) {
                    this._inTemplate = false;
                    return new Token(TokenType.ERROR, 'Unterminated template string', this.line, this.column);
                }
            }

            // Operators and punctuation
            switch (this.currentChar) {
                case ';': this.advance(); return new Token(TokenType.SEMICOLON, ';', this.line, this.column - 1);
                case ',': this.advance(); return new Token(TokenType.COMMA, ',', this.line, this.column - 1);
                case '.': 
                    // Only a dot if not followed by a digit (otherwise handled by number logic above)
                    this.advance();
                    if (this.currentChar === '?') {
                        this.advance();
                        return new Token(TokenType.OPTIONAL_CHAINING, '?.', this.line, this.column - 2);
                    }
                    return new Token(TokenType.DOT, '.', this.line, this.column - 1);
                case ':': this.advance(); return new Token(TokenType.COLON, ':', this.line, this.column - 1);
                case '?': 
                    // Check for optional chaining (?.)
                    if (this.peek() === '.') {
                        this.advance(); // consume ?
                        this.advance(); // consume .
                        return new Token(TokenType.OPTIONAL_CHAINING, '?.', this.line, this.column - 2);
                    }
                    this.advance();
                    if (this.currentChar === '?') {
                        this.advance();
                        return new Token(TokenType.NULLISH_COALESCING, '??', this.line, this.column - 2);
                    }
                    return new Token(TokenType.QUESTION_MARK, '?', this.line, this.column - 1);
                case '(': this.advance(); return new Token(TokenType.LEFT_PAREN, '(', this.line, this.column - 1);
                case ')': this.advance(); return new Token(TokenType.RIGHT_PAREN, ')', this.line, this.column - 1);
                case '{': this.advance(); return new Token(TokenType.LEFT_BRACE, '{', this.line, this.column - 1);
                case '}': this.advance(); return new Token(TokenType.RIGHT_BRACE, '}', this.line, this.column - 1);
                case '[': this.advance(); return new Token(TokenType.LEFT_BRACKET, '[', this.line, this.column - 1);
                case ']': this.advance(); return new Token(TokenType.RIGHT_BRACKET, ']', this.line, this.column - 1);
                case '<': this.advance(); return new Token(TokenType.LEFT_ANGLE, '<', this.line, this.column - 1);
                case '>': this.advance(); return new Token(TokenType.RIGHT_ANGLE, '>', this.line, this.column - 1);
                case '|': 
                    this.advance();
                    if (this.currentChar === '|') {
                        this.advance();
                        return new Token(TokenType.OPERATOR, '||', this.line, this.column - 2);
                    }
                    return new Token(TokenType.UNION, '|', this.line, this.column - 1);
                case '&': 
                    this.advance();
                    if (this.currentChar === '&') {
                        this.advance();
                        return new Token(TokenType.OPERATOR, '&&', this.line, this.column - 2);
                    }
                    return new Token(TokenType.INTERSECTION, '&', this.line, this.column - 1);
                case '=': 
                    this.advance();
                    if (this.currentChar === '=') {
                        this.advance();
                        if (this.currentChar === '=') {
                            this.advance();
                            return new Token(TokenType.OPERATOR, '===', this.line, this.column - 3);
                        }
                        return new Token(TokenType.OPERATOR, '==', this.line, this.column - 2);
                    }
                    return new Token(TokenType.ASSIGNMENT, '=', this.line, this.column - 1);
                case '+': this.advance(); return new Token(TokenType.OPERATOR, '+', this.line, this.column - 1);
                case '-': this.advance(); return new Token(TokenType.OPERATOR, '-', this.line, this.column - 1);
                case '*': this.advance(); return new Token(TokenType.OPERATOR, '*', this.line, this.column - 1);
                case '/': this.advance(); return new Token(TokenType.OPERATOR, '/', this.line, this.column - 1);
                case '%': this.advance(); return new Token(TokenType.OPERATOR, '%', this.line, this.column - 1);
                case '!': 
                    this.advance();
                    if (this.currentChar === '=') {
                        this.advance();
                        if (this.currentChar === '=') {
                            this.advance();
                            return new Token(TokenType.OPERATOR, '!==', this.line, this.column - 3);
                        }
                        return new Token(TokenType.OPERATOR, '!=', this.line, this.column - 2);
                    }
                    return new Token(TokenType.OPERATOR, '!', this.line, this.column - 1);
                case '$': 
                    this.advance();
                    if (this.currentChar === '{') {
                        this.advance();
                        return new Token(TokenType.TEMPLATE_EXPRESSION, '', this.line, this.column - 2);
                    }
                    return new Token(TokenType.ERROR, 'Invalid character: $', this.line, this.column - 1);
            }

            // If we get here, we have an invalid character
            return new Token(TokenType.ERROR, `Invalid character: ${this.currentChar}`, this.line, this.column);
        }

        return new Token(TokenType.EOF, null, this.line, this.column);
    }

    tokenize() {
        const tokens = [];
        let token = this.getNextToken();
        
        while (token.type !== TokenType.EOF && token.type !== TokenType.ERROR) {
            // If token is an array (from template string), push all
            if (Array.isArray(token)) {
                for (const t of token) {
                    if (t.type === TokenType.ERROR) {
                        throw new Error(`Lexer error at line ${t.line}, column ${t.column}: ${t.value}`);
                    }
                    tokens.push(t);
                }
            } else {
                tokens.push(token);
            }
            token = this.getNextToken();
        }
        
        if (token.type === TokenType.ERROR) {
            throw new Error(`Lexer error at line ${token.line}, column ${token.column}: ${token.value}`);
        }
        
        tokens.push(token); // Add EOF token
        return tokens;
    }
}

module.exports = Lexer; 