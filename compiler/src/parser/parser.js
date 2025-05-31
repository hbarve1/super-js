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
        // function [*] name (params) [: returnType] { body }
        this.expect(TokenType.KEYWORD, 'function');
        // Support generator functions: function* name ...
        let isGenerator = false;
        if (this.current.type === TokenType.OPERATOR && this.current.value === '*') {
            isGenerator = true;
            this.advance();
        }
        // Support async functions: async function ...
        // (Handled in parseStatement if you want to support async)
        const idToken = this.expect(TokenType.IDENTIFIER);
        // Parse parameter list
        this.expect(TokenType.LEFT_PAREN);
        const params = [];
        while (this.current.type !== TokenType.RIGHT_PAREN && this.current.type !== TokenType.EOF) {
            if (this.current.type === TokenType.IDENTIFIER) {
                const paramName = this.current.value;
                this.advance();
                let varType = null;
                if (this.current.type === TokenType.COLON) {
                    this.advance();
                    if (this.current.type === TokenType.KEYWORD || this.current.type === TokenType.IDENTIFIER) {
                        varType = this.current.value;
                        this.advance();
                    }
                }
                params.push({ name: paramName, varType });
                if (this.current.type === TokenType.COMMA) {
                    this.advance();
                } else if (this.current.type !== TokenType.RIGHT_PAREN) {
                    break;
                }
            } else {
                // Skip unexpected tokens in params
                this.advance();
            }
        }
        this.expect(TokenType.RIGHT_PAREN);
        // Optional return type
        let returnType = null;
        if (this.current.type === TokenType.COLON) {
            this.advance();
            if (this.current.type === TokenType.KEYWORD || this.current.type === TokenType.IDENTIFIER) {
                returnType = this.current.value;
                this.advance();
            }
        }
        // Parse body (for now, just skip to matching RIGHT_BRACE)
        this.expect(TokenType.LEFT_BRACE);
        let braceDepth = 1;
        // Optionally, collect body tokens for future expansion
        while (braceDepth > 0 && this.current.type !== TokenType.EOF) {
            if (this.current.type === TokenType.LEFT_BRACE) braceDepth++;
            if (this.current.type === TokenType.RIGHT_BRACE) braceDepth--;
            this.advance();
        }
        return {
            type: 'FunctionDeclaration',
            id: idToken.value,
            params,
            returnType,
            isGenerator,
            body: { type: 'BlockStatement', body: [] } // stub for now
        };
    }

    parseClassDeclaration() {
        this.expect(TokenType.KEYWORD, 'class');
        const idToken = this.expect(TokenType.IDENTIFIER);
        // Optionally parse 'extends' and superclass
        let superClass = null;
        if (this.current.type === TokenType.KEYWORD && this.current.value === 'extends') {
            this.advance();
            if (this.current.type === TokenType.IDENTIFIER) {
                superClass = this.current.value;
                this.advance();
            }
        }
        // Optionally parse 'implements' (skip for now)
        if (this.current.type === TokenType.KEYWORD && this.current.value === 'implements') {
            while (this.current.type !== TokenType.LEFT_BRACE && this.current.type !== TokenType.EOF) {
                this.advance();
            }
        }
        this.expect(TokenType.LEFT_BRACE);
        const body = [];
        while (this.current.type !== TokenType.RIGHT_BRACE && this.current.type !== TokenType.EOF) {
            // Property: IDENTIFIER [: TYPE] ;
            if (this.current.type === TokenType.IDENTIFIER) {
                const key = this.current.value;
                this.advance();
                let varType = null;
                if (this.current.type === TokenType.COLON) {
                    this.advance();
                    if (this.current.type === TokenType.KEYWORD || this.current.type === TokenType.IDENTIFIER) {
                        varType = this.current.value;
                        this.advance();
                    }
                }
                // If next is LEFT_PAREN, it's a method
                if (this.current.type === TokenType.LEFT_PAREN) {
                    // Method
                    const method = this.parseMethodDefinition(key);
                    body.push(method);
                } else {
                    // Property
                    // Optionally expect SEMICOLON
                    if (this.current.type === TokenType.SEMICOLON) this.advance();
                    body.push({ type: 'ClassProperty', key, varType });
                }
            } else if (this.current.type === TokenType.KEYWORD && this.current.value === 'constructor') {
                // Parse constructor as a method
                const key = 'constructor';
                this.advance();
                const method = this.parseMethodDefinition(key);
                body.push(method);
            } else {
                // Skip unknown tokens in class body
                this.advance();
            }
        }
        this.expect(TokenType.RIGHT_BRACE);
        return {
            type: 'ClassDeclaration',
            id: idToken.value,
            superClass,
            body
        };
    }

    parseMethodDefinition(key) {
        // Parse params
        this.expect(TokenType.LEFT_PAREN);
        const params = [];
        while (this.current.type !== TokenType.RIGHT_PAREN && this.current.type !== TokenType.EOF) {
            if (this.current.type === TokenType.IDENTIFIER) {
                const paramName = this.current.value;
                this.advance();
                let varType = null;
                if (this.current.type === TokenType.COLON) {
                    this.advance();
                    if (this.current.type === TokenType.KEYWORD || this.current.type === TokenType.IDENTIFIER) {
                        varType = this.current.value;
                        this.advance();
                    }
                }
                params.push({ name: paramName, varType });
                if (this.current.type === TokenType.COMMA) {
                    this.advance();
                } else if (this.current.type !== TokenType.RIGHT_PAREN) {
                    break;
                }
            } else {
                // Skip unexpected tokens in params
                this.advance();
            }
        }
        this.expect(TokenType.RIGHT_PAREN);
        // Optional return type
        let returnType = null;
        if (this.current.type === TokenType.COLON) {
            this.advance();
            if (this.current.type === TokenType.KEYWORD || this.current.type === TokenType.IDENTIFIER) {
                returnType = this.current.value;
                this.advance();
            }
        }
        // Parse body (for now, just skip to matching RIGHT_BRACE)
        this.expect(TokenType.LEFT_BRACE);
        let braceDepth = 1;
        while (braceDepth > 0 && this.current.type !== TokenType.EOF) {
            if (this.current.type === TokenType.LEFT_BRACE) braceDepth++;
            if (this.current.type === TokenType.RIGHT_BRACE) braceDepth--;
            this.advance();
        }
        return {
            type: 'MethodDefinition',
            key,
            params,
            returnType,
            body: { type: 'BlockStatement', body: [] }
        };
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
        // type|interface|enum|namespace NAME ...
        const kind = this.current.value;
        this.advance();
        const idToken = this.expect(TokenType.IDENTIFIER);
        // For now, just skip to the next block or semicolon and stub the body
        let body = [];
        if (this.current.type === TokenType.LEFT_BRACE) {
            // Skip block
            this.advance();
            let braceDepth = 1;
            while (braceDepth > 0 && this.current.type !== TokenType.EOF) {
                if (this.current.type === TokenType.LEFT_BRACE) braceDepth++;
                if (this.current.type === TokenType.RIGHT_BRACE) braceDepth--;
                this.advance();
            }
        } else {
            // Skip until semicolon
            while (this.current.type !== TokenType.SEMICOLON && this.current.type !== TokenType.EOF) {
                this.advance();
            }
            if (this.current.type === TokenType.SEMICOLON) this.advance();
        }
        let nodeType = 'TypeDeclaration';
        if (kind === 'interface') nodeType = 'InterfaceDeclaration';
        if (kind === 'enum') nodeType = 'EnumDeclaration';
        if (kind === 'namespace') nodeType = 'NamespaceDeclaration';
        return {
            type: nodeType,
            kind,
            id: idToken.value,
            body
        };
    }

    parseControlFlow() {
        if (this.current.type === TokenType.KEYWORD && this.current.value === 'if') {
            return this.parseIfStatement();
        }
        // For now, fallback to stub for other control flow
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

    parseIfStatement() {
        this.expect(TokenType.KEYWORD, 'if');
        this.expect(TokenType.LEFT_PAREN);
        // For now, stub the test (condition)
        let test = { type: 'Expression', stub: true };
        // Skip until RIGHT_PAREN
        while (this.current.type !== TokenType.RIGHT_PAREN && this.current.type !== TokenType.EOF) {
            this.advance();
        }
        this.expect(TokenType.RIGHT_PAREN);
        // Parse consequent (then branch)
        let consequent = { type: 'BlockStatement', body: [] };
        if (this.current.type === TokenType.LEFT_BRACE) {
            // Skip block
            this.advance();
            let braceDepth = 1;
            while (braceDepth > 0 && this.current.type !== TokenType.EOF) {
                if (this.current.type === TokenType.LEFT_BRACE) braceDepth++;
                if (this.current.type === TokenType.RIGHT_BRACE) braceDepth--;
                this.advance();
            }
        } else {
            // Skip single statement
            if (this.current.type !== TokenType.EOF) this.advance();
        }
        // Parse alternate (else branch)
        let alternate = null;
        if (this.current.type === TokenType.KEYWORD && this.current.value === 'else') {
            this.advance();
            if (this.current.type === TokenType.LEFT_BRACE) {
                // Skip block
                this.advance();
                let braceDepth = 1;
                while (braceDepth > 0 && this.current.type !== TokenType.EOF) {
                    if (this.current.type === TokenType.LEFT_BRACE) braceDepth++;
                    if (this.current.type === TokenType.RIGHT_BRACE) braceDepth--;
                    this.advance();
                }
                alternate = { type: 'BlockStatement', body: [] };
            } else {
                // Skip single statement
                if (this.current.type !== TokenType.EOF) this.advance();
                alternate = { type: 'BlockStatement', body: [] };
            }
        }
        return {
            type: 'IfStatement',
            test,
            consequent,
            alternate
        };
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
