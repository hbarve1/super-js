const TokenType = require('../lexer/libs/token-types');
const expressions = require('./libs/expressions');
const functions = require('./libs/functions');
const loops = require('./libs/loops');
const tryStmts = require('./libs/try');
const conditionals = require('./libs/conditionals');
const patterns = require('./libs/patterns');
const controlflow = require('./libs/controlflow');
const variables = require('./libs/variables');
const classes = require('./libs/classes');
const types = require('./libs/types');

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
        return variables.parseVariableDeclaration(this);
    }

    parseArrayPattern() {
        return patterns.parseArrayPattern(this);
    }

    parseObjectPattern() {
        return patterns.parseObjectPattern(this);
    }

    parseFunctionDeclaration() {
        return functions.parseFunctionDeclaration(this);
    }

    parseClassDeclaration() {
        return classes.parseClassDeclaration(this);
    }

    parseMethodDefinition(key) {
        return classes.parseMethodDefinition(this, key);
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
        return types.parseTypeDeclaration(this);
    }

    parseControlFlow() {
        return controlflow.parseControlFlow(this);
    }

    parseIfStatement() {
        return conditionals.parseIfStatement(this);
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
        return conditionals.parseSwitchStatement(this);
    }

    parseTryStatement() {
        return tryStmts.parseTryStatement(this);
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
