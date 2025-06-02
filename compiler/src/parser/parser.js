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
const block = require('./libs/block');
const importexport = require('./libs/export');
const statements = require('./libs/statements');
const program = require('./libs/program');
const parserUtils = require('./libs/parser-utils');

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.position = 0;
        this.TokenType = TokenType;
    }

    get current() {
        return parserUtils.getCurrent(this);
    }

    peek(offset = 1) {
        return parserUtils.peek(this, offset);
    }

    advance() {
        return parserUtils.advance(this);
    }

    expect(type, value) {
        return parserUtils.expect(this, type, value);
    }

    parse() {
        // Parse a sequence of statements (for now, only variable declarations)
        return this.parseProgram();
    }

    parseProgram() {
        return program.parseProgram(this);
    }

    parseStatement() {
        return statements.parseStatement(this);
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
        return importexport.parseImportExport(this);
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
        return expressions.parseExpressionStatement(this);
    }

    // --- Expression Parsing ---
    parseExpression(precedence = 0) { return expressions.parseExpression(this, precedence); }
    parsePrimaryExpression() { return expressions.parsePrimaryExpression(this); }
    isBinaryOperator(token) { return expressions.isBinaryOperator(token); }
    getPrecedence(token) { return expressions.getPrecedence(token); }

    parseBlockStatement() {
        return block.parseBlockStatement(this);
    }

    parseTypeAnnotation() {
        return types.parseTypeAnnotation(this);
    }

    parsePrimaryType() {
        return types.parsePrimaryType(this);
    }

    _parseGenerics() {
        return functions._parseGenerics(this);
    }

    _parseFunctionParams() {
        return functions._parseFunctionParams(this);
    }

    parseImport() {
        return require('./libs/export').parseImport(this);
    }
    parseExport() {
        return require('./libs/export').parseExport(this);
    }
}

module.exports = Parser;
