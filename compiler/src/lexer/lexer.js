const Token = require('./libs/token');
const TokenType = require('./libs/token-types');
const { allKeywords } = require('../keywords');
const { readTemplateStringSegment } = require('./libs/template');
const { matchOperatorOrPunctuator } = require('./libs/operators');
const CharStream = require('./libs/char-stream');
const { skipComment } = require('./libs/comments');
const { readNumber } = require('./libs/number');

class Lexer {
    constructor(source) {
        this.charStream = new CharStream(source);
        this._templateStack = [];
        this._templateBuffer = '';
        this._inTemplate = false;
        this._templateNesting = 0;
    }

    // Proxy CharStream properties for compatibility
    get source() { return this.charStream.source; }
    get position() { return this.charStream.position; }
    get line() { return this.charStream.line; }
    get column() { return this.charStream.column; }
    get currentChar() { return this.charStream.currentChar; }
    advance() { this.charStream.advance(); }
    peek() { return this.charStream.peek(); }

    skipWhitespace() {
        while (this.currentChar && /\s/.test(this.currentChar)) {
            this.advance();
        }
    }

    readIdentifier() {
        let result = '';
        const startColumn = this.column;

        // Unicode-aware identifier: letter, number, underscore
        while (this.currentChar && /[\p{L}\p{N}_]/u.test(this.currentChar)) {
            result += this.currentChar;
            this.advance();
        }

        // Check if it's a keyword
        if (allKeywords.includes(result)) {
            return new Token(TokenType.KEYWORD, result, this.line, startColumn);
        }

        return new Token(TokenType.IDENTIFIER, result, this.line, startColumn);
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

    // --- Token methods ---
    getIdentifierOrKeyword() {
        return this.readIdentifier();
    }

    getNumber() {
        return readNumber(this);
    }

    getString() {
        return this.readString();
    }

    getTemplateToken() {
        // Template mode handled in getNextToken
        // This is just a dispatcher for the initial backtick
        this.advance();
        this._inTemplate = true;
        this._templateBuffer = '';
        const { value, startColumn } = readTemplateStringSegment(this);
        this._templateBuffer += value;
        if (this.currentChar === '$' && this.peek() === '{') {
            const segment = this._templateBuffer;
            this._templateBuffer = '';
            return new Token(TokenType.TEMPLATE_STRING, segment, this.line, startColumn);
        }
        if (this.currentChar === '`') {
            const segment = this._templateBuffer;
            this._templateBuffer = '';
            this._inTemplate = false;
            this.advance();
            return new Token(TokenType.TEMPLATE_STRING, segment, this.line, startColumn);
        }
        if (!this.currentChar) {
            this._inTemplate = false;
            return new Token(TokenType.ERROR, 'Unterminated template string', this.line, this.column);
        }
    }

    getOperatorOrPunctuation() {
        // Use the helper to match the longest operator or punctuator
        const op = matchOperatorOrPunctuator(this);
        if (op) {
            const startColumn = this.column;
            for (let i = 0; i < op.length; i++) {
                this.advance();
            }
            // Map operator string to token type
            switch (op) {
                case ';': return new Token(TokenType.SEMICOLON, op, this.line, startColumn);
                case ',': return new Token(TokenType.COMMA, op, this.line, startColumn);
                case '.': return new Token(TokenType.DOT, op, this.line, startColumn);
                case ':': return new Token(TokenType.COLON, op, this.line, startColumn);
                case '?': return new Token(TokenType.QUESTION_MARK, op, this.line, startColumn);
                case '(': return new Token(TokenType.LEFT_PAREN, op, this.line, startColumn);
                case ')': return new Token(TokenType.RIGHT_PAREN, op, this.line, startColumn);
                case '{': return new Token(TokenType.LEFT_BRACE, op, this.line, startColumn);
                case '}': return new Token(TokenType.RIGHT_BRACE, op, this.line, startColumn);
                case '[': return new Token(TokenType.LEFT_BRACKET, op, this.line, startColumn);
                case ']': return new Token(TokenType.RIGHT_BRACKET, op, this.line, startColumn);
                case '<': return new Token(TokenType.LEFT_ANGLE, op, this.line, startColumn);
                case '>': return new Token(TokenType.RIGHT_ANGLE, op, this.line, startColumn);
                case '|': return new Token(TokenType.UNION, op, this.line, startColumn);
                case '&': return new Token(TokenType.INTERSECTION, op, this.line, startColumn);
                case '?.': return new Token(TokenType.OPTIONAL_CHAINING, op, this.line, startColumn);
                case '??': return new Token(TokenType.NULLISH_COALESCING, op, this.line, startColumn);
                case '=': return new Token(TokenType.ASSIGNMENT, op, this.line, startColumn);
                case '==':
                case '===':
                case '!=':
                case '!==':
                case '||':
                case '&&':
                case '+':
                case '-':
                case '*':
                case '/':
                case '%':
                case '!':
                    return new Token(TokenType.OPERATOR, op, this.line, startColumn);
            }
        }
        // If we get here, we have an invalid character
        return new Token(TokenType.ERROR, `Invalid character: ${this.currentChar}`, this.line, this.column);
    }

    // --- Main dispatcher ---
    getNextToken() {
        // Handle template mode
        if (this._inTemplate) {
            // Handle nested template expressions
            if (this._templateNesting > 0) {
                // Inside a template expression
                if (this.currentChar === '$' && this.peek() === '{') {
                    this._templateNesting++;
                    this.advance(); // Skip $
                    this.advance(); // Skip {
                    return new Token(TokenType.TEMPLATE_EXPRESSION, '', this.line, this.column - 2);
                }
                if (this.currentChar === '}') {
                    this._templateNesting--;
                    this.advance();
                    if (this._templateNesting === 0) {
                        // Resume template string segment
                        return this.getNextToken();
                    }
                    // Still inside nested template expression
                    return this.getNextToken();
                }
                // Normal lexing inside template expression
                // Fall through to normal lexing below
            } else {
                if (this.currentChar === '}') {
                    this.advance();
                }
                if (this.currentChar === '`') {
                    this.advance();
                    this._inTemplate = false;
                    return new Token(TokenType.TEMPLATE_STRING, this._templateBuffer, this.line, this.column - 1);
                }
                if (this.currentChar === '$' && this.peek() === '{') {
                    const segment = this._templateBuffer;
                    this._templateBuffer = '';
                    this.advance();
                    this.advance();
                    this._templateNesting = 1;
                    return new Token(TokenType.TEMPLATE_EXPRESSION, segment, this.line, this.column - 2);
                }
                const { value, startColumn } = readTemplateStringSegment(this);
                this._templateBuffer += value;
                if (this.currentChar === '$' && this.peek() === '{') {
                    const segment = this._templateBuffer;
                    this._templateBuffer = '';
                    return new Token(TokenType.TEMPLATE_STRING, segment, this.line, startColumn);
                }
                if (this.currentChar === '`') {
                    const segment = this._templateBuffer;
                    this._templateBuffer = '';
                    return new Token(TokenType.TEMPLATE_STRING, segment, this.line, startColumn);
                }
                if (!this.currentChar) {
                    this._inTemplate = false;
                    return new Token(TokenType.ERROR, 'Unterminated template string', this.line, this.column);
                }
            }
        }

        while (this.currentChar) {
            if (/\s/.test(this.currentChar)) {
                this.skipWhitespace();
                continue;
            }
            if (this.currentChar === '/' && (this.peek() === '/' || this.peek() === '*')) {
                skipComment(this);
                continue;
            }
            // Unicode-aware identifier start: letter or _
            if (/[\p{L}_]/u.test(this.currentChar)) {
                return this.getIdentifierOrKeyword();
            }
            if (
                /[0-9]/.test(this.currentChar) ||
                (this.currentChar === '.' && /[0-9]/.test(this.peek()))
            ) {
                return this.getNumber();
            }
            if (this.currentChar === '"' || this.currentChar === "'") {
                return this.getString();
            }
            if (this.currentChar === '`') {
                return this.getTemplateToken();
            }
            // Operators and punctuation
            return this.getOperatorOrPunctuation();
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