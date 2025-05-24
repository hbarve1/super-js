#include "../../include/parser/StatementParser.h"
#include <memory>

namespace superjs {

std::unique_ptr<Statement> StatementParser::parseStatement() {
    if (match(TokenKind::If)) return parseIfStatement();
    if (match(TokenKind::While)) return parseWhileStatement();
    if (match(TokenKind::For)) return parseForStatement();
    if (match(TokenKind::Return)) return parseReturnStatement();
    if (match(TokenKind::Function)) return parseFunctionDeclaration();
    if (match(TokenKind::Class)) return parseClassDeclaration();
    if (match(TokenKind::Import)) return parseImportStatement();
    if (match(TokenKind::Export)) return parseExportStatement();
    if (match(TokenKind::Type)) return parseTypeDeclaration();
    if (match(TokenKind::Interface)) return parseInterfaceDeclaration();
    if (match(TokenKind::Let) || match(TokenKind::Const)) return parseVariableDeclaration();
    if (match(TokenKind::LeftBrace)) return parseBlockStatement();

    return std::make_unique<ExpressionStatement>(exprParser.parseExpression());
}

std::unique_ptr<Statement> StatementParser::parseBlockStatement() {
    std::vector<std::unique_ptr<Statement>> statements;

    while (!check(TokenKind::RightBrace) && !isAtEnd()) {
        statements.push_back(parseStatement());
    }

    consume(TokenKind::RightBrace, "Expect '}' after block.");
    return std::make_unique<BlockStatement>(std::move(statements));
}

std::unique_ptr<Statement> StatementParser::parseIfStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'if'.");
    auto condition = exprParser.parseExpression();
    consume(TokenKind::RightParen, "Expect ')' after if condition.");

    auto thenBranch = parseStatement();
    std::unique_ptr<Statement> elseBranch = nullptr;
    if (match(TokenKind::Else)) {
        elseBranch = parseStatement();
    }

    return std::make_unique<IfStatement>(std::move(condition), std::move(thenBranch), std::move(elseBranch));
}

std::unique_ptr<Statement> StatementParser::parseWhileStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'while'.");
    auto condition = exprParser.parseExpression();
    consume(TokenKind::RightParen, "Expect ')' after while condition.");

    auto body = parseStatement();
    return std::make_unique<WhileStatement>(std::move(condition), std::move(body));
}

std::unique_ptr<Statement> StatementParser::parseForStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'for'.");

    std::unique_ptr<Statement> initializer;
    if (match(TokenKind::Semicolon)) {
        initializer = nullptr;
    } else if (match(TokenKind::Let) || match(TokenKind::Const)) {
        initializer = parseVariableDeclaration();
    } else {
        initializer = std::make_unique<ExpressionStatement>(exprParser.parseExpression());
        consume(TokenKind::Semicolon, "Expect ';' after loop initializer.");
    }

    std::unique_ptr<Expression> condition = nullptr;
    if (!check(TokenKind::Semicolon)) {
        condition = exprParser.parseExpression();
    }
    consume(TokenKind::Semicolon, "Expect ';' after loop condition.");

    std::unique_ptr<Expression> increment = nullptr;
    if (!check(TokenKind::RightParen)) {
        increment = exprParser.parseExpression();
    }
    consume(TokenKind::RightParen, "Expect ')' after for clauses.");

    auto body = parseStatement();

    // Desugar for loop into while loop
    if (increment != nullptr) {
        std::vector<std::unique_ptr<Statement>> bodyStatements;
        bodyStatements.push_back(std::move(body));
        bodyStatements.push_back(std::make_unique<ExpressionStatement>(std::move(increment)));
        body = std::make_unique<BlockStatement>(std::move(bodyStatements));
    }

    if (condition == nullptr) {
        condition = std::make_unique<LiteralExpression>(Token(TokenKind::True, "true", peek().line, peek().column));
    }
    body = std::make_unique<WhileStatement>(std::move(condition), std::move(body));

    if (initializer != nullptr) {
        std::vector<std::unique_ptr<Statement>> statements;
        statements.push_back(std::move(initializer));
        statements.push_back(std::move(body));
        body = std::make_unique<BlockStatement>(std::move(statements));
    }

    return body;
}

std::unique_ptr<Statement> StatementParser::parseReturnStatement() {
    Token keyword = previous();
    std::unique_ptr<Expression> value = nullptr;
    if (!check(TokenKind::Semicolon)) {
        value = exprParser.parseExpression();
    }

    consume(TokenKind::Semicolon, "Expect ';' after return value.");
    return std::make_unique<ReturnStatement>(keyword, std::move(value));
}

std::unique_ptr<Statement> StatementParser::parseFunctionDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect function name.");
    consume(TokenKind::LeftParen, "Expect '(' after function name.");

    std::vector<Token> parameters;
    if (!check(TokenKind::RightParen)) {
        do {
            if (parameters.size() >= 255) {
                error(peek(), "Cannot have more than 255 parameters.");
            }
            parameters.push_back(consume(TokenKind::Identifier, "Expect parameter name."));
        } while (match(TokenKind::Comma));
    }
    consume(TokenKind::RightParen, "Expect ')' after parameters.");

    consume(TokenKind::LeftBrace, "Expect '{' before function body.");
    auto body = parseBlockStatement();

    return std::make_unique<FunctionDeclaration>(name, std::move(parameters), std::move(body));
}

std::unique_ptr<Statement> StatementParser::parseClassDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect class name.");

    std::unique_ptr<VariableExpression> superclass = nullptr;
    if (match(TokenKind::Less)) {
        consume(TokenKind::Identifier, "Expect superclass name.");
        superclass = std::make_unique<VariableExpression>(previous());
    }

    consume(TokenKind::LeftBrace, "Expect '{' before class body.");

    std::vector<std::unique_ptr<FunctionExpression>> methods;
    while (!check(TokenKind::RightBrace) && !isAtEnd()) {
        methods.push_back(std::unique_ptr<FunctionExpression>(
            dynamic_cast<FunctionExpression*>(parseFunctionDeclaration().release())));
    }

    consume(TokenKind::RightBrace, "Expect '}' after class body.");
    return std::make_unique<ClassDeclaration>(name, std::move(superclass), std::move(methods));
}

std::unique_ptr<Statement> StatementParser::parseVariableDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect variable name.");

    std::unique_ptr<Expression> initializer = nullptr;
    if (match(TokenKind::Equal)) {
        initializer = exprParser.parseExpression();
    }

    consume(TokenKind::Semicolon, "Expect ';' after variable declaration.");
    return std::make_unique<VariableDeclaration>(name, nullptr, std::move(initializer));
}

std::unique_ptr<Statement> StatementParser::parseExportStatement() { return nullptr; }
std::unique_ptr<Statement> StatementParser::parseImportStatement() { return nullptr; }
std::unique_ptr<Statement> StatementParser::parseTypeDeclaration() { return nullptr; }
std::unique_ptr<Statement> StatementParser::parseInterfaceDeclaration() { return nullptr; }

// Helper methods
bool StatementParser::match(TokenKind kind) {
    if (check(kind)) {
        advance();
        return true;
    }
    return false;
}

bool StatementParser::check(TokenKind kind) const {
    if (isAtEnd()) return false;
    return peek().kind == kind;
}

Token StatementParser::advance() {
    if (!isAtEnd()) current++;
    return previous();
}

Token StatementParser::peek() const {
    return tokens[current];
}

Token StatementParser::previous() const {
    return tokens[current - 1];
}

bool StatementParser::isAtEnd() const {
    return peek().kind == TokenKind::EndOfFile;
}

Token StatementParser::consume(TokenKind kind, const std::string& message) {
    if (check(kind)) return advance();
    throw error(peek(), message);
}

ParseError StatementParser::error(const Token& token, const std::string& message) {
    return ParseError(message);
}

void StatementParser::synchronize() {
    advance();

    while (!isAtEnd()) {
        if (previous().kind == TokenKind::Semicolon) return;

        switch (peek().kind) {
            case TokenKind::Class:
            case TokenKind::Function:
            case TokenKind::Let:
            case TokenKind::Const:
            case TokenKind::For:
            case TokenKind::If:
            case TokenKind::While:
            case TokenKind::Return:
                return;
            default:
                break;
        }

        advance();
    }
}

} // namespace superjs 