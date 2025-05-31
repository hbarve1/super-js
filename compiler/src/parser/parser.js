const TokenType = require('../lexer/libs/token-types');

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.position = 0;
    }

    get current() {
        return this.tokens[this.position];
    }

    peek(offset = 1) {
        return this.tokens[this.position + offset] || { type: 'EOF' };
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
                case 'return': {
                    this.advance();
                    let argument = null;
                    if (this.current.type !== TokenType.SEMICOLON && this.current.type !== TokenType.RIGHT_BRACE && this.current.type !== TokenType.EOF) {
                        argument = this.parseExpression();
                    }
                    if (this.current.type === TokenType.SEMICOLON) this.advance();
                    return { type: 'ReturnStatement', argument };
                }
                case 'break': {
                    this.advance();
                    if (this.current.type === TokenType.SEMICOLON) this.advance();
                    return { type: 'BreakStatement' };
                }
                case 'continue': {
                    this.advance();
                    if (this.current.type === TokenType.SEMICOLON) this.advance();
                    return { type: 'ContinueStatement' };
                }
                case 'throw': {
                    this.advance();
                    let argument = null;
                    if (this.current.type !== TokenType.SEMICOLON && this.current.type !== TokenType.RIGHT_BRACE && this.current.type !== TokenType.EOF) {
                        argument = this.parseExpression();
                    }
                    if (this.current.type === TokenType.SEMICOLON) this.advance();
                    return { type: 'ThrowStatement', argument };
                }
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
            varType = this.parseTypeAnnotation();
        }
        let init = null;
        if (this.current.type === TokenType.ASSIGNMENT) {
            this.advance();
            // Use parseExpression for initializer
            try {
                init = this.parseExpression();
            } catch (e) {
                // If the initializer is invalid, use a stub node
                init = { type: 'Expression', stub: true, error: e.message };
                // Attempt to recover: skip to semicolon
                while (this.current.type !== TokenType.SEMICOLON && this.current.type !== TokenType.EOF) {
                    this.advance();
                }
            }
        }
        this.expect(TokenType.SEMICOLON);
        const node = {
            type: 'VariableDeclaration',
            kind: kindToken.value,
            id: idToken.value,
            varType,
            init
        };
        // console.log('parseVariableDeclaration:', JSON.stringify(node, null, 2));
        return node;
    }

    parseFunctionDeclaration() {
        this.expect(TokenType.KEYWORD, 'function');
        // Support generator functions: function* name ...
        let isGenerator = false;
        if (this.current.type === TokenType.OPERATOR && this.current.value === '*') {
            isGenerator = true;
            this.advance();
        }
        // Parse function name
        const idToken = this.expect(TokenType.IDENTIFIER);
        // Parse generics: function f<T, U>(...)
        let generics = null;
        if (this.current.type === TokenType.LEFT_ANGLE) {
            this.advance();
            generics = [];
            while (this.current.type !== TokenType.RIGHT_ANGLE && this.current.type !== TokenType.EOF) {
                if (this.current.type === TokenType.IDENTIFIER) {
                    generics.push(this.current.value);
                    this.advance();
                }
                if (this.current.type === TokenType.COMMA) {
                    this.advance();
                } else if (this.current.type !== TokenType.RIGHT_ANGLE) {
                    break;
                }
            }
            this.expect(TokenType.RIGHT_ANGLE);
        }
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
                    varType = this.parseTypeAnnotation();
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
            returnType = this.parseTypeAnnotation();
        }
        // Parse body
        const body = this.parseBlockStatement();
        return {
            type: 'FunctionDeclaration',
            id: idToken.value,
            params,
            returnType,
            isGenerator,
            generics,
            body
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
        // Parse body
        const body = this.parseBlockStatement();
        return {
            type: 'MethodDefinition',
            key,
            params,
            returnType,
            body
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
        let consequent = null;
        if (this.current.type === TokenType.LEFT_BRACE) {
            consequent = this.parseBlockStatement();
        } else {
            // Skip single statement
            if (this.current.type !== TokenType.EOF) this.advance();
            consequent = { type: 'BlockStatement', body: [] };
        }
        // Parse alternate (else branch)
        let alternate = null;
        if (this.current.type === TokenType.KEYWORD && this.current.value === 'else') {
            this.advance();
            if (this.current.type === TokenType.LEFT_BRACE) {
                alternate = this.parseBlockStatement();
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
        // Parse body
        let body = null;
        if (this.current.type === TokenType.LEFT_BRACE) {
            body = this.parseBlockStatement();
        } else {
            // Skip single statement
            if (this.current.type !== TokenType.EOF) this.advance();
            body = { type: 'BlockStatement', body: [] };
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
        // Parse body
        let body = null;
        if (this.current.type === TokenType.LEFT_BRACE) {
            body = this.parseBlockStatement();
        } else {
            // Skip single statement
            if (this.current.type !== TokenType.EOF) this.advance();
            body = { type: 'BlockStatement', body: [] };
        }
        return {
            type: 'WhileStatement',
            test,
            body
        };
    }

    parseDoWhileStatement() {
        this.expect(TokenType.KEYWORD, 'do');
        // Parse body
        let body = null;
        if (this.current.type === TokenType.LEFT_BRACE) {
            body = this.parseBlockStatement();
        } else {
            // Skip single statement
            if (this.current.type !== TokenType.EOF) this.advance();
            body = { type: 'BlockStatement', body: [] };
        }
        this.expect(TokenType.KEYWORD, 'while');
        this.expect(TokenType.LEFT_PAREN);
        // Use parseExpression for test
        let test = this.parseExpression();
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
        // Parse discriminant
        let discriminant = this.parseExpression();
        this.expect(TokenType.RIGHT_PAREN);
        const cases = [];
        if (this.current.type === TokenType.LEFT_BRACE) {
            this.advance();
            while (this.current.type !== TokenType.RIGHT_BRACE && this.current.type !== TokenType.EOF) {
                if (this.current.type === TokenType.KEYWORD && this.current.value === 'case') {
                    this.advance();
                    const test = this.parseExpression();
                    this.expect(TokenType.COLON);
                    const consequent = [];
                    while (
                        (this.current.type !== TokenType.KEYWORD || (this.current.value !== 'case' && this.current.value !== 'default')) &&
                        this.current.type !== TokenType.RIGHT_BRACE && this.current.type !== TokenType.EOF
                    ) {
                        const stmt = this.parseStatement();
                        if (stmt) consequent.push(stmt);
                    }
                    cases.push({ type: 'SwitchCase', test, consequent });
                } else if (this.current.type === TokenType.KEYWORD && this.current.value === 'default') {
                    this.advance();
                    this.expect(TokenType.COLON);
                    const consequent = [];
                    while (
                        (this.current.type !== TokenType.KEYWORD || (this.current.value !== 'case' && this.current.value !== 'default')) &&
                        this.current.type !== TokenType.RIGHT_BRACE && this.current.type !== TokenType.EOF
                    ) {
                        const stmt = this.parseStatement();
                        if (stmt) consequent.push(stmt);
                    }
                    cases.push({ type: 'SwitchCase', test: null, consequent });
                } else {
                    this.advance();
                }
            }
            this.expect(TokenType.RIGHT_BRACE);
        }
        return {
            type: 'SwitchStatement',
            discriminant,
            cases
        };
    }

    parseTryStatement() {
        this.expect(TokenType.KEYWORD, 'try');
        // Parse try block
        let block = null;
        if (this.current.type === TokenType.LEFT_BRACE) {
            block = this.parseBlockStatement();
        } else {
            block = { type: 'BlockStatement', body: [] };
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
            // Parse catch block
            let catchBlock = null;
            if (this.current.type === TokenType.LEFT_BRACE) {
                catchBlock = this.parseBlockStatement();
            } else {
                catchBlock = { type: 'BlockStatement', body: [] };
            }
            handler = { param, body: catchBlock };
        }
        // Parse finally block
        let finalizer = null;
        if (this.current.type === TokenType.KEYWORD && this.current.value === 'finally') {
            this.advance();
            let finallyBlock = null;
            if (this.current.type === TokenType.LEFT_BRACE) {
                finallyBlock = this.parseBlockStatement();
            } else {
                finallyBlock = { type: 'BlockStatement', body: [] };
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
            // --- Ternary/Conditional Expression ---
            if (this.current.type === TokenType.QUESTION_MARK && precedence <= 1) {
                this.advance();
                const consequent = this.parseExpression();
                this.expect(TokenType.COLON);
                const alternate = this.parseExpression();
                left = {
                    type: 'ConditionalExpression',
                    test: left,
                    consequent,
                    alternate
                };
                continue;
            }
            // --- Assignment Expression ---
            if (this.current.type === TokenType.ASSIGNMENT || (this.current.type === TokenType.OPERATOR && ['+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '>>>='].includes(this.current.value))) {
                // Assignment has the lowest precedence
                if (precedence > 0) break;
                const operator = this.current.value;
                this.advance();
                const right = this.parseExpression(0);
                left = {
                    type: 'AssignmentExpression',
                    operator,
                    left,
                    right
                };
                continue;
            }
            // --- Postfix Update Expression ---
            if (this.current.type === TokenType.OPERATOR && (this.current.value === '++' || this.current.value === '--')) {
                const operator = this.current.value;
                this.advance();
                left = {
                    type: 'UpdateExpression',
                    operator,
                    argument: left,
                    prefix: false
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
        // --- Prefix Update Expression ---
        if (this.current.type === TokenType.OPERATOR && (this.current.value === '++' || this.current.value === '--')) {
            const operator = this.current.value;
            this.advance();
            const argument = this.parsePrimaryExpression();
            return {
                type: 'UpdateExpression',
                operator,
                argument,
                prefix: true
            };
        }
        // --- Unary expressions ---
        if (
            (this.current.type === TokenType.OPERATOR && ['!', '+', '-', '~'].includes(this.current.value)) ||
            (this.current.type === TokenType.KEYWORD && ['typeof', 'void', 'delete'].includes(this.current.value))
        ) {
            const operator = this.current.value;
            this.advance();
            const argument = this.parsePrimaryExpression();
            return {
                type: 'UnaryExpression',
                operator,
                argument,
                prefix: true
            };
        }
        // --- Arrow function (parenthesized params) ---
        if (this.current.type === TokenType.LEFT_PAREN) {
            // Lookahead for arrow: parse params, check for '=>'
            const startPos = this.position;
            const startToken = this.current;
            let pos = this.position + 1;
            let params = [];
            let validParams = true;
            let paramTokens = [];
            let parenDepth = 1;
            while (pos < this.tokens.length && parenDepth > 0) {
                const token = this.tokens[pos];
                if (token.type === TokenType.LEFT_PAREN) parenDepth++;
                if (token.type === TokenType.RIGHT_PAREN) parenDepth--;
                if (parenDepth === 1 && token.type === TokenType.IDENTIFIER) {
                    let paramName = token.value;
                    let varType = null;
                    let next = this.tokens[pos + 1];
                    if (next && next.type === TokenType.COLON) {
                        let typeToken = this.tokens[pos + 2];
                        if (typeToken && (typeToken.type === TokenType.KEYWORD || typeToken.type === TokenType.IDENTIFIER)) {
                            varType = typeToken.value;
                            pos += 2;
                        }
                    }
                    params.push({ name: paramName, varType });
                }
                paramTokens.push(token);
                pos++;
            }
            // After params, check for return type and '=>'
            let afterParen = this.tokens[pos];
            let returnType = null;
            let arrowPos = pos;
            if (afterParen && afterParen.type === TokenType.COLON) {
                let typeToken = this.tokens[pos + 1];
                if (typeToken && (typeToken.type === TokenType.KEYWORD || typeToken.type === TokenType.IDENTIFIER)) {
                    returnType = typeToken.value;
                    arrowPos = pos + 2;
                    afterParen = this.tokens[arrowPos];
                }
            }
            if (afterParen && afterParen.type === TokenType.OPERATOR && afterParen.value === '=>') {
                // It's an arrow function! Now actually consume tokens
                this.advance(); // (
                while (this.current.type !== TokenType.RIGHT_PAREN && this.current.type !== TokenType.EOF) {
                    this.advance();
                }
                this.expect(TokenType.RIGHT_PAREN);
                if (returnType !== null) {
                    this.expect(TokenType.COLON);
                    this.advance(); // type
                }
                this.expect(TokenType.OPERATOR, '=>');
                // Arrow function body: expression or block
                let body;
                if (this.current.type === TokenType.LEFT_BRACE) {
                    body = this.parseBlockStatement();
                } else {
                    body = this.parseExpression();
                }
                return {
                    type: 'ArrowFunctionExpression',
                    params,
                    returnType,
                    body
                };
            } else {
                // Not an arrow function, parse as grouped expression
                this.advance(); // (
                const expr = this.parseExpression();
                this.expect(TokenType.RIGHT_PAREN);
                return expr;
            }
        }
        // --- Arrow function (single param) ---
        if (this.current.type === TokenType.IDENTIFIER && this.peek().type === TokenType.OPERATOR && this.peek().value === '=>') {
            const paramName = this.current.value;
            this.advance();
            this.expect(TokenType.OPERATOR, '=>');
            let body;
            if (this.current.type === TokenType.LEFT_BRACE) {
                body = this.parseBlockStatement();
            } else {
                body = this.parseExpression();
            }
            return {
                type: 'ArrowFunctionExpression',
                params: [{ name: paramName, varType: null }],
                returnType: null,
                body
            };
        }
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

    parseBlockStatement() {
        this.expect(TokenType.LEFT_BRACE);
        const body = [];
        while (this.current.type !== TokenType.RIGHT_BRACE && this.current.type !== TokenType.EOF) {
            const stmt = this.parseStatement();
            if (stmt) body.push(stmt);
        }
        this.expect(TokenType.RIGHT_BRACE);
        return { type: 'BlockStatement', body };
    }

    parseTypeAnnotation() {
        // Parse union and intersection types
        let type = this.parsePrimaryType();
        // Array type: T[]
        while (this.current.type === TokenType.LEFT_BRACKET && this.peek().type === TokenType.RIGHT_BRACKET) {
            this.advance(); // [
            this.advance(); // ]
            type = { type: 'ArrayType', elementType: type };
        }
        while (this.current.type === TokenType.UNION || this.current.type === TokenType.INTERSECTION) {
            const operator = this.current.type === TokenType.UNION ? '|' : '&';
            this.advance();
            const right = this.parsePrimaryType();
            type = {
                type: operator === '|' ? 'UnionType' : 'IntersectionType',
                left: type,
                right
            };
        }
        return type;
    }

    parsePrimaryType() {
        // Parse a single type: identifier, generic, object, or parenthesized type
        if (this.current.type === TokenType.IDENTIFIER || this.current.type === TokenType.KEYWORD) {
            const name = this.current.value;
            this.advance();
            // Generic type: Foo<Bar>
            if (this.current.type === TokenType.LEFT_ANGLE) {
                this.advance();
                const typeParams = [];
                while (this.current.type !== TokenType.RIGHT_ANGLE && this.current.type !== TokenType.EOF) {
                    typeParams.push(this.parseTypeAnnotation());
                    if (this.current.type === TokenType.COMMA) {
                        this.advance();
                    } else {
                        break;
                    }
                }
                this.expect(TokenType.RIGHT_ANGLE);
                return {
                    type: 'GenericType',
                    name,
                    typeParams
                };
            }
            return { type: 'TypeIdentifier', name };
        }
        // Object type literal: { p: number, q: string }
        if (this.current.type === TokenType.LEFT_BRACE) {
            this.advance();
            const properties = [];
            while (this.current.type !== TokenType.RIGHT_BRACE && this.current.type !== TokenType.EOF) {
                if (this.current.type === TokenType.IDENTIFIER) {
                    const key = this.current.value;
                    this.advance();
                    this.expect(TokenType.COLON);
                    const valueType = this.parseTypeAnnotation();
                    properties.push({ key, valueType });
                    if (this.current.type === TokenType.COMMA) {
                        this.advance();
                    } else if (this.current.type !== TokenType.RIGHT_BRACE) {
                        break;
                    }
                } else {
                    // Skip unexpected tokens
                    this.advance();
                }
            }
            this.expect(TokenType.RIGHT_BRACE);
            return { type: 'ObjectType', properties };
        }
        // Parenthesized type
        if (this.current.type === TokenType.LEFT_PAREN) {
            this.advance();
            const type = this.parseTypeAnnotation();
            this.expect(TokenType.RIGHT_PAREN);
            return type;
        }
        // Array type: T[]
        if (this.current.type === TokenType.LEFT_BRACKET) {
            this.advance();
            this.expect(TokenType.RIGHT_BRACKET);
            return { type: 'ArrayType', elementType: { type: 'TypeIdentifier', name: 'any' } };
        }
        // Fallback
        return { type: 'TypeIdentifier', name: 'any' };
    }
}

module.exports = Parser; 
