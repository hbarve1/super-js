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
        // Parse a sequence of statements (for now, only variable declarations)
        return this.parseProgram();
    }

    parseProgram() {
        // Parse as many statements as possible
        const body = [];
        while (this.current.type !== TokenType.EOF) {
            // Skip empty tokens (shouldn't happen, but for safety)
            if (this.current.type === TokenType.EOF) break;
            try {
                const stmt = this.parseStatement();
                if (stmt) body.push(stmt);
            } catch (e) {
                // Skip tokens until next semicolon or block end if not a valid statement
                while (
                    this.current.type !== TokenType.SEMICOLON &&
                    this.current.type !== TokenType.RIGHT_BRACE &&
                    this.current.type !== TokenType.EOF
                ) {
                    this.advance();
                }
                if (this.current.type === TokenType.SEMICOLON || this.current.type === TokenType.RIGHT_BRACE) this.advance();
            }
        }
        return { type: 'Program', body };
    }

    parseStatement() {
        if (this.current.type === TokenType.KEYWORD) {
            switch (this.current.value) {
                case 'let':
                case 'const':
                case 'var':
                    return this.parseVariableDeclaration();
                case 'function':
                    return this.parseFunctionDeclaration();
                case 'class':
                    return this.parseClassDeclaration();
                case 'import':
                case 'export':
                    return this.parseImportExport();
                case 'type':
                case 'interface':
                case 'enum':
                case 'namespace':
                    return this.parseTypeDeclaration();
                case 'if':
                case 'for':
                case 'while':
                case 'do':
                case 'switch':
                case 'try':
                case 'with':
                    return this.parseControlFlow();
                default:
                    return this.parseExpressionStatement();
            }
        }
        // Fallback: parse as expression statement
        return this.parseExpressionStatement();
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

    parseFunctionDeclaration() {
        // Skip tokens until next RIGHT_BRACE or SEMICOLON
        while (
            this.current.type !== TokenType.RIGHT_BRACE &&
            this.current.type !== TokenType.SEMICOLON &&
            this.current.type !== TokenType.EOF
        ) {
            this.advance();
        }
        if (this.current.type === TokenType.RIGHT_BRACE || this.current.type === TokenType.SEMICOLON) this.advance();
        return { type: 'FunctionDeclaration', skipped: true };
    }

    parseClassDeclaration() {
        while (
            this.current.type !== TokenType.RIGHT_BRACE &&
            this.current.type !== TokenType.SEMICOLON &&
            this.current.type !== TokenType.EOF
        ) {
            this.advance();
        }
        if (this.current.type === TokenType.RIGHT_BRACE || this.current.type === TokenType.SEMICOLON) this.advance();
        return { type: 'ClassDeclaration', skipped: true };
    }

    parseImportExport() {
        while (
            this.current.type !== TokenType.SEMICOLON &&
            this.current.type !== TokenType.EOF
        ) {
            this.advance();
        }
        if (this.current.type === TokenType.SEMICOLON) this.advance();
        return { type: 'ImportExportDeclaration', skipped: true };
    }

    parseTypeDeclaration() {
        while (
            this.current.type !== TokenType.SEMICOLON &&
            this.current.type !== TokenType.RIGHT_BRACE &&
            this.current.type !== TokenType.EOF
        ) {
            this.advance();
        }
        if (this.current.type === TokenType.SEMICOLON || this.current.type === TokenType.RIGHT_BRACE) this.advance();
        return { type: 'TypeDeclaration', skipped: true };
    }

    parseControlFlow() {
        while (
            this.current.type !== TokenType.RIGHT_BRACE &&
            this.current.type !== TokenType.SEMICOLON &&
            this.current.type !== TokenType.EOF
        ) {
            this.advance();
        }
        if (this.current.type === TokenType.RIGHT_BRACE || this.current.type === TokenType.SEMICOLON) this.advance();
        return { type: 'ControlFlowStatement', skipped: true };
    }

    parseExpressionStatement() {
        // Skip until semicolon or block end
        while (
            this.current.type !== TokenType.SEMICOLON &&
            this.current.type !== TokenType.RIGHT_BRACE &&
            this.current.type !== TokenType.EOF
        ) {
            this.advance();
        }
        if (this.current.type === TokenType.SEMICOLON || this.current.type === TokenType.RIGHT_BRACE) this.advance();
        return { type: 'ExpressionStatement', skipped: true };
    }
}

module.exports = Parser; 
