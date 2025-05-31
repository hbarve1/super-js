const TokenType = require('../lexer/libs/token-types');
const expressions = require('./libs/expressions');
const functions = require('./libs/functions');
const loops = require('./libs/loops');

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.position = 0;
        this.TokenType = TokenType;
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
            // console.log('[Parser Debug] At loop start, current token:', this.current);
            if (this.current.type === TokenType.EOF) break;
            try {
                const stmt = this.parseStatement();
                if (Array.isArray(stmt)) {
                    body.push(...stmt);
                } else if (stmt) {
                    body.push(stmt);
                }
            } catch (e) {
                // Error recovery: skip to next semicolon or block end
                while (
                    this.current.type !== TokenType.SEMICOLON &&
                    this.current.type !== TokenType.RIGHT_BRACE &&
                    this.current.type !== TokenType.EOF
                ) {
                    this.advance();
                }
                // Only advance if at semicolon or right brace
                if (this.current.type === TokenType.SEMICOLON || this.current.type === TokenType.RIGHT_BRACE) {
                    this.advance();
                }
                // Now continue loop (do not unconditionally advance)
            }
            // No unconditional advance here!
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
        // Debug: print current token at start of variable declaration
        // console.log('[Parser Debug] parseVariableDeclaration at token:', this.current);
        // let|const|var IDENTIFIER [: TYPE] [= expr] [, ...] ;
        if (
            this.current.type !== TokenType.KEYWORD ||
            !['let', 'const', 'var'].includes(this.current.value)
        ) {
            throw new Error('Expected variable declaration keyword');
        }
        const kindToken = this.current;
        this.advance();
        // console.log('[Parser Debug] after let/const/var, current token:', this.current);
        const declarations = [];
        let first = true;
        while (true) {
            let idNode = null;
            let invalidDeclarator = false;
            if (this.current.type === TokenType.LEFT_BRACKET) {
                // Allow empty array pattern
                idNode = this.parseArrayPattern();
            } else if (this.current.type === TokenType.LEFT_BRACE) {
                // Allow empty object pattern
                idNode = this.parseObjectPattern();
            } else {
                if (this.current.type !== TokenType.IDENTIFIER) {
                    invalidDeclarator = true;
                } else {
                    const idToken = this.expect(TokenType.IDENTIFIER);
                    idNode = idToken.value;
                }
            }
            let varType = null;
            if (!invalidDeclarator && this.current.type === TokenType.COLON) {
                this.advance();
                varType = this.parseTypeAnnotation();
            }
            let init = null;
            if (!invalidDeclarator && this.current.type === TokenType.ASSIGNMENT) {
                this.advance();
                try {
                    init = this.parseExpression();
                } catch (e) {
                    init = { type: 'Expression', stub: true, error: e.message };
                    // Attempt to recover: skip to comma or semicolon
                    while (this.current.type !== TokenType.COMMA && this.current.type !== TokenType.SEMICOLON && this.current.type !== TokenType.EOF) {
                        this.advance();
                    }
                }
            }
            // Disallow const without initializer
            if (!invalidDeclarator && kindToken.value === 'const' && init == null) {
                invalidDeclarator = true;
            }
            if (!invalidDeclarator) {
                declarations.push({
                    type: 'VariableDeclaration',
                    kind: kindToken.value,
                    id: idNode,
                    varType,
                    init
                });
            } else if (first) {
                // Do NOT consume or advance past the semicolon here; let parseProgram handle it
                throw new Error('Invalid variable declarator');
            }
            first = false;
            if (this.current.type === TokenType.SEMICOLON) {
                this.advance();
                return declarations.length === 1 ? declarations[0] : declarations;
            }
            if (this.current.type === TokenType.COMMA) {
                this.advance();
                continue;
            } else {
                break;
            }
        }
        // If not at a semicolon, treat as invalid (do not add to AST)
        return null;
    }

    parseArrayPattern() {
        // [x, y, ...rest]
        this.expect(TokenType.LEFT_BRACKET);
        const elements = [];
        while (this.current.type !== TokenType.RIGHT_BRACKET && this.current.type !== TokenType.EOF) {
            if (this.current.type === TokenType.IDENTIFIER) {
                elements.push({ type: 'Identifier', name: this.current.value });
                this.advance();
            } else if (this.current.type === TokenType.COMMA) {
                elements.push(null); // Allow holes
                this.advance();
            } else if (this.current.type === TokenType.RIGHT_BRACKET) {
                break;
            } else {
                // For now, skip unsupported pattern elements
                this.advance();
            }
            if (this.current.type === TokenType.COMMA) {
                this.advance();
            }
        }
        this.expect(TokenType.RIGHT_BRACKET);
        return { type: 'ArrayPattern', elements };
    }

    parseObjectPattern() {
        // {p, q: alias, ...rest, nested: { b } }
        this.expect(TokenType.LEFT_BRACE);
        const properties = [];
        while (this.current.type !== TokenType.RIGHT_BRACE && this.current.type !== TokenType.EOF) {
            if (this.current.type === TokenType.IDENTIFIER) {
                const key = this.current.value;
                this.advance();
                let value = { type: 'Identifier', name: key };
                if (this.current.type === TokenType.COLON) {
                    this.advance();
                    if (this.current.type === TokenType.IDENTIFIER) {
                        value = { type: 'Identifier', name: this.current.value };
                        this.advance();
                    } else if (this.current.type === TokenType.LEFT_BRACE) {
                        // Nested object pattern
                        value = this.parseObjectPattern();
                    } else if (this.current.type === TokenType.LEFT_BRACKET) {
                        // Nested array pattern
                        value = this.parseArrayPattern();
                    }
                }
                properties.push({ key, value });
            } else if (this.current.type === TokenType.COMMA) {
                this.advance();
            } else if (this.current.type === TokenType.RIGHT_BRACE) {
                break;
            } else {
                // For now, skip unsupported pattern elements
                this.advance();
            }
        }
        this.expect(TokenType.RIGHT_BRACE);
        return { type: 'ObjectPattern', properties };
    }

    parseFunctionDeclaration() {
        return functions.parseFunctionDeclaration(this);
    }

    parseMethodDefinition(key) {
        return functions.parseMethodDefinition(this, key);
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
                    varType = this.parseTypeAnnotation();
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
        return loops.parseForStatement(this);
    }

    parseWhileStatement() {
        return loops.parseWhileStatement(this);
    }

    parseDoWhileStatement() {
        return loops.parseDoWhileStatement(this);
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
    parseExpression(precedence = 0) { return expressions.parseExpression(this, precedence); }
    parsePrimaryExpression() { return expressions.parsePrimaryExpression(this); }
    isBinaryOperator(token) { return expressions.isBinaryOperator(token); }
    getPrecedence(token) { return expressions.getPrecedence(token); }

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
