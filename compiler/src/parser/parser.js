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
        // --- Destructuring support ---
        if (this.current.type === TokenType.LEFT_BRACKET) {
            // Array destructuring pattern
            // Skip to semicolon
            while (this.current.type !== TokenType.SEMICOLON && this.current.type !== TokenType.EOF) {
                this.advance();
            }
            if (this.current.type === TokenType.SEMICOLON) this.advance();
            return { type: 'VariableDeclaration', kind: kindToken.value, id: { type: 'ArrayPattern' }, varType: null, init: null, skipped: true };
        }
        if (this.current.type === TokenType.LEFT_BRACE) {
            // Object destructuring pattern
            // Skip to semicolon
            while (this.current.type !== TokenType.SEMICOLON && this.current.type !== TokenType.EOF) {
                this.advance();
            }
            if (this.current.type === TokenType.SEMICOLON) this.advance();
            return { type: 'VariableDeclaration', kind: kindToken.value, id: { type: 'ObjectPattern' }, varType: null, init: null, skipped: true };
        }
        // --- Normal identifier ---
        const idToken = this.expect(TokenType.IDENTIFIER);
        let varType = null;
        if (this.current.type === TokenType.COLON) {
            this.advance();
            if (this.current.type === TokenType.KEYWORD || this.current.type === TokenType.IDENTIFIER) {
                varType = this.current.value;
                this.advance();
                // Support array type annotation: number[]
                if (this.current.type === TokenType.LEFT_BRACKET) {
                    this.advance();
                    if (this.current.type === TokenType.RIGHT_BRACKET) {
                        this.advance();
                        varType += '[]';
                    }
                }
            } else if (this.current.type === TokenType.LEFT_BRACE) {
                // Skip object type literal
                let depth = 1;
                this.advance();
                while (depth > 0 && this.current.type !== TokenType.EOF) {
                    if (this.current.type === TokenType.LEFT_BRACE) depth++;
                    if (this.current.type === TokenType.RIGHT_BRACE) depth--;
                    this.advance();
                }
            } else {
                throw new Error('Expected type after colon');
            }
        }
        let init = null;
        if (this.current.type === TokenType.ASSIGNMENT) {
            this.advance();
            // Use parseExpression for initializer
            init = this.parseExpression();
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
        if (this.current.type === TokenType.KEYWORD && this.current.value === 'for') {
            return this.parseForStatement();
        }
        if (this.current.type === TokenType.KEYWORD && this.current.value === 'while') {
            return this.parseWhileStatement();
        }
        if (this.current.type === TokenType.KEYWORD && this.current.value === 'do') {
            return this.parseDoWhileStatement();
        }
        if (this.current.type === TokenType.KEYWORD && this.current.value === 'switch') {
            return this.parseSwitchStatement();
        }
        if (this.current.type === TokenType.KEYWORD && this.current.value === 'try') {
            return this.parseTryStatement();
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
        // Use parseExpression for test
        let test = this.parseExpression();
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

    parseForStatement() {
        this.expect(TokenType.KEYWORD, 'for');
        this.expect(TokenType.LEFT_PAREN);
        let init = null;
        if (this.current.type === TokenType.KEYWORD && ['let', 'const', 'var'].includes(this.current.value)) {
            init = this.parseVariableDeclaration();
        } else if (this.current.type !== TokenType.SEMICOLON) {
            init = this.parseExpression();
            if (this.current.type === TokenType.SEMICOLON) this.advance();
        } else {
            // No init
            this.advance();
        }
        let test = null;
        if (this.current.type !== TokenType.SEMICOLON) {
            test = this.parseExpression();
        }
        this.expect(TokenType.SEMICOLON);
        let update = null;
        if (this.current.type !== TokenType.RIGHT_PAREN) {
            update = this.parseExpression();
        }
        this.expect(TokenType.RIGHT_PAREN);
        // Parse body (as stub block)
        let body = { type: 'BlockStatement', body: [] };
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
        return {
            type: 'ForStatement',
            init,
            test,
            update,
            body
        };
    }

    parseWhileStatement() {
        this.expect(TokenType.KEYWORD, 'while');
        this.expect(TokenType.LEFT_PAREN);
        // Use parseExpression for test
        let test = this.parseExpression();
        this.expect(TokenType.RIGHT_PAREN);
        // Parse body (as stub block)
        let body = { type: 'BlockStatement', body: [] };
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
        return {
            type: 'WhileStatement',
            test,
            body
        };
    }

    parseDoWhileStatement() {
        this.expect(TokenType.KEYWORD, 'do');
        // Parse body (as stub block)
        let body = { type: 'BlockStatement', body: [] };
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
        this.expect(TokenType.KEYWORD, 'while');
        this.expect(TokenType.LEFT_PAREN);
        // For now, stub test
        let test = { type: 'Expression', stub: true };
        // Skip until RIGHT_PAREN
        while (this.current.type !== TokenType.RIGHT_PAREN && this.current.type !== TokenType.EOF) {
            this.advance();
        }
        this.expect(TokenType.RIGHT_PAREN);
        // Optionally expect SEMICOLON
        if (this.current.type === TokenType.SEMICOLON) this.advance();
        return {
            type: 'DoWhileStatement',
            body,
            test
        };
    }

    parseSwitchStatement() {
        this.expect(TokenType.KEYWORD, 'switch');
        this.expect(TokenType.LEFT_PAREN);
        // For now, stub discriminant
        let discriminant = { type: 'Expression', stub: true };
        // Skip until RIGHT_PAREN
        while (this.current.type !== TokenType.RIGHT_PAREN && this.current.type !== TokenType.EOF) {
            this.advance();
        }
        this.expect(TokenType.RIGHT_PAREN);
        // Parse cases (as empty array for now)
        if (this.current.type === TokenType.LEFT_BRACE) {
            // Skip block
            this.advance();
            let braceDepth = 1;
            while (braceDepth > 0 && this.current.type !== TokenType.EOF) {
                if (this.current.type === TokenType.LEFT_BRACE) braceDepth++;
                if (this.current.type === TokenType.RIGHT_BRACE) braceDepth--;
                this.advance();
            }
        }
        return {
            type: 'SwitchStatement',
            discriminant,
            cases: []
        };
    }

    parseTryStatement() {
        this.expect(TokenType.KEYWORD, 'try');
        // Parse try block (as stub block)
        let block = { type: 'BlockStatement', body: [] };
        if (this.current.type === TokenType.LEFT_BRACE) {
            // Skip block
            this.advance();
            let braceDepth = 1;
            while (braceDepth > 0 && this.current.type !== TokenType.EOF) {
                if (this.current.type === TokenType.LEFT_BRACE) braceDepth++;
                if (this.current.type === TokenType.RIGHT_BRACE) braceDepth--;
                this.advance();
            }
        }
        // Parse catch clause
        let handler = null;
        if (this.current.type === TokenType.KEYWORD && this.current.value === 'catch') {
            this.advance();
            let param = null;
            if (this.current.type === TokenType.LEFT_PAREN) {
                this.advance();
                if (this.current.type === TokenType.IDENTIFIER) {
                    param = this.current.value;
                    this.advance();
                }
                // Skip to RIGHT_PAREN
                while (this.current.type !== TokenType.RIGHT_PAREN && this.current.type !== TokenType.EOF) {
                    this.advance();
                }
                if (this.current.type === TokenType.RIGHT_PAREN) this.advance();
            }
            // Parse catch block (as stub block)
            let catchBlock = { type: 'BlockStatement', body: [] };
            if (this.current.type === TokenType.LEFT_BRACE) {
                this.advance();
                let braceDepth = 1;
                while (braceDepth > 0 && this.current.type !== TokenType.EOF) {
                    if (this.current.type === TokenType.LEFT_BRACE) braceDepth++;
                    if (this.current.type === TokenType.RIGHT_BRACE) braceDepth--;
                    this.advance();
                }
            }
            handler = { param, body: catchBlock };
        }
        // Parse finally block
        let finalizer = null;
        if (this.current.type === TokenType.KEYWORD && this.current.value === 'finally') {
            this.advance();
            let finallyBlock = { type: 'BlockStatement', body: [] };
            if (this.current.type === TokenType.LEFT_BRACE) {
                this.advance();
                let braceDepth = 1;
                while (braceDepth > 0 && this.current.type !== TokenType.EOF) {
                    if (this.current.type === TokenType.LEFT_BRACE) braceDepth++;
                    if (this.current.type === TokenType.RIGHT_BRACE) braceDepth--;
                    this.advance();
                }
            }
            finalizer = finallyBlock;
        }
        return {
            type: 'TryStatement',
            block,
            handler,
            finalizer
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

    // --- Expression Parsing ---
    parseExpression(precedence = 0) {
        let left = this.parsePrimaryExpression();
        // Handle member and call expressions (postfix)
        while (true) {
            if (this.current.type === TokenType.DOT) {
                this.advance();
                if (this.current.type === TokenType.IDENTIFIER) {
                    left = {
                        type: 'MemberExpression',
                        object: left,
                        property: { type: 'Identifier', name: this.current.value },
                        computed: false
                    };
                    this.advance();
                    continue;
                }
            } else if (this.current.type === TokenType.LEFT_BRACKET) {
                this.advance();
                const property = this.parseExpression();
                this.expect(TokenType.RIGHT_BRACKET);
                left = {
                    type: 'MemberExpression',
                    object: left,
                    property,
                    computed: true
                };
                continue;
            } else if (this.current.type === TokenType.LEFT_PAREN) {
                // Function call
                this.advance();
                const args = [];
                while (this.current.type !== TokenType.RIGHT_PAREN && this.current.type !== TokenType.EOF) {
                    args.push(this.parseExpression());
                    if (this.current.type === TokenType.COMMA) {
                        this.advance();
                    } else {
                        break;
                    }
                }
                this.expect(TokenType.RIGHT_PAREN);
                left = {
                    type: 'CallExpression',
                    callee: left,
                    arguments: args
                };
                continue;
            }
            // Binary operators
            if (this.isBinaryOperator(this.current) && this.getPrecedence(this.current) > precedence) {
                const opToken = this.current;
                const opPrecedence = this.getPrecedence(opToken);
                this.advance();
                const right = this.parseExpression(opPrecedence);
                left = {
                    type: 'BinaryExpression',
                    operator: opToken.value,
                    left,
                    right
                };
                continue;
            }
            break;
        }
        return left;
    }

    parsePrimaryExpression() {
        if (this.current.type === TokenType.NUMBER) {
            const value = this.current.value;
            this.advance();
            return { type: 'Literal', value };
        }
        if (this.current.type === TokenType.STRING) {
            const value = this.current.value;
            this.advance();
            return { type: 'Literal', value };
        }
        if (this.current.type === TokenType.KEYWORD && ['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'].includes(this.current.value)) {
            let value;
            switch (this.current.value) {
                case 'true': value = true; break;
                case 'false': value = false; break;
                case 'null': value = null; break;
                case 'undefined': value = undefined; break;
                case 'NaN': value = NaN; break;
                case 'Infinity': value = Infinity; break;
            }
            this.advance();
            return { type: 'Literal', value };
        }
        if (this.current.type === TokenType.IDENTIFIER) {
            const name = this.current.value;
            this.advance();
            return { type: 'Identifier', name };
        }
        if (this.current.type === TokenType.LEFT_PAREN) {
            this.advance();
            const expr = this.parseExpression();
            this.expect(TokenType.RIGHT_PAREN);
            return expr;
        }
        // --- Array literal ---
        if (this.current.type === TokenType.LEFT_BRACKET) {
            this.advance();
            const elements = [];
            while (this.current.type !== TokenType.RIGHT_BRACKET && this.current.type !== TokenType.EOF) {
                if (this.current.type === TokenType.COMMA) {
                    // Allow empty elements (e.g., [1,,2])
                    elements.push(null);
                    this.advance();
                    continue;
                }
                elements.push(this.parseExpression());
                if (this.current.type === TokenType.COMMA) {
                    this.advance();
                } else {
                    break;
                }
            }
            this.expect(TokenType.RIGHT_BRACKET);
            return { type: 'ArrayExpression', elements };
        }
        // --- Object literal ---
        if (this.current.type === TokenType.LEFT_BRACE) {
            this.advance();
            const properties = [];
            while (this.current.type !== TokenType.RIGHT_BRACE && this.current.type !== TokenType.EOF) {
                // Key: identifier or string
                let key = null;
                if (this.current.type === TokenType.IDENTIFIER) {
                    key = { type: 'Identifier', name: this.current.value };
                    this.advance();
                } else if (this.current.type === TokenType.STRING) {
                    key = { type: 'Literal', value: this.current.value };
                    this.advance();
                } else {
                    break;
                }
                this.expect(TokenType.COLON);
                const value = this.parseExpression();
                properties.push({ key, value });
                if (this.current.type === TokenType.COMMA) {
                    this.advance();
                } else {
                    break;
                }
            }
            this.expect(TokenType.RIGHT_BRACE);
            return { type: 'ObjectExpression', properties };
        }
        // Fallback stub
        this.advance();
        return { type: 'Expression', stub: true };
    }

    isBinaryOperator(token) {
        return token.type === TokenType.OPERATOR || token.type === TokenType.ASSIGNMENT;
    }

    getPrecedence(token) {
        // Very basic precedence for demo
        const op = token.value;
        if (op === '===' || op === '!==') return 3;
        if (op === '+' || op === '-') return 2;
        if (op === '*' || op === '/') return 4;
        if (op === '=') return 1;
        return 0;
    }
}

module.exports = Parser; 
