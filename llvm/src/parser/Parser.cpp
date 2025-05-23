#include "Parser.h"
#include <stdexcept>

namespace superjs {

Parser::Parser(const std::vector<Token>& tokens)
    : tokens(tokens), current(0) {}

std::vector<std::unique_ptr<Stmt>> Parser::parse() {
    std::vector<std::unique_ptr<Stmt>> statements;
    
    while (!isAtEnd()) {
        try {
            statements.push_back(statement());
        } catch (const ParseError& error) {
            synchronize();
        }
    }
    
    return statements;
}

bool Parser::isAtEnd() const {
    return peek().kind == TokenKind::EndOfFile;
}

Token Parser::advance() {
    if (!isAtEnd()) current++;
    return previous();
}

bool Parser::check(TokenKind kind) const {
    if (isAtEnd()) return false;
    return peek().kind == kind;
}

bool Parser::match(TokenKind kind) {
    if (check(kind)) {
        advance();
        return true;
    }
    return false;
}

Token Parser::consume(TokenKind kind, const std::string& message) {
    if (check(kind)) return advance();
    throw error(peek(), message);
}

Token Parser::peek() const {
    return tokens[current];
}

Token Parser::previous() const {
    return tokens[current - 1];
}

ParseError Parser::error(const Token& token, const std::string& message) {
    return ParseError("Error at '" + token.text + "': " + message);
}

void Parser::synchronize() {
    advance();
    
    while (!isAtEnd()) {
        if (previous().kind == TokenKind::Semicolon) return;
        
        switch (peek().kind) {
            case TokenKind::Class:
            case TokenKind::Function:
            case TokenKind::Var:
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

std::unique_ptr<Stmt> Parser::statement() {
    if (match(TokenKind::If)) return ifStatement();
    if (match(TokenKind::While)) return whileStatement();
    if (match(TokenKind::For)) return forStatement();
    if (match(TokenKind::Return)) return returnStatement();
    if (match(TokenKind::Function)) return functionStatement();
    if (match(TokenKind::Class)) return classStatement();
    if (match(TokenKind::Import)) return importStatement();
    if (match(TokenKind::Export)) return exportStatement();
    if (match(TokenKind::Type)) return typeStatement();
    if (match(TokenKind::Interface)) return interfaceStatement();
    if (match(TokenKind::LeftBrace)) return blockStatement();
    
    return expressionStatement();
}

std::unique_ptr<Stmt> Parser::ifStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'if'.");
    auto condition = expression();
    consume(TokenKind::RightParen, "Expect ')' after if condition.");
    
    auto thenBranch = statement();
    std::unique_ptr<Stmt> elseBranch;
    
    if (match(TokenKind::Else)) {
        elseBranch = statement();
    }
    
    return std::make_unique<IfStmt>(std::move(condition), std::move(thenBranch), std::move(elseBranch));
}

std::unique_ptr<Stmt> Parser::whileStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'while'.");
    auto condition = expression();
    consume(TokenKind::RightParen, "Expect ')' after while condition.");
    
    auto body = statement();
    
    return std::make_unique<WhileStmt>(std::move(condition), std::move(body));
}

std::unique_ptr<Stmt> Parser::forStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'for'.");
    
    std::unique_ptr<Stmt> initializer;
    if (match(TokenKind::Semicolon)) {
        initializer = nullptr;
    } else if (match(TokenKind::Var) || match(TokenKind::Let) || match(TokenKind::Const)) {
        initializer = variableDeclaration();
    } else {
        initializer = expressionStatement();
    }
    
    std::unique_ptr<Expr> condition = nullptr;
    if (!check(TokenKind::Semicolon)) {
        condition = expression();
    }
    consume(TokenKind::Semicolon, "Expect ';' after loop condition.");
    
    std::unique_ptr<Expr> increment = nullptr;
    if (!check(TokenKind::RightParen)) {
        increment = expression();
    }
    consume(TokenKind::RightParen, "Expect ')' after for clauses.");
    
    auto body = statement();
    
    // Desugar for loop into while loop
    if (increment != nullptr) {
        std::vector<std::unique_ptr<Stmt>> bodyStatements;
        bodyStatements.push_back(std::move(body));
        bodyStatements.push_back(std::make_unique<ExpressionStmt>(std::move(increment)));
        body = std::make_unique<BlockStmt>(std::move(bodyStatements));
    }
    
    if (condition == nullptr) {
        condition = std::make_unique<LiteralExpr>(Token{TokenKind::True, "true", 0, 0});
    }
    body = std::make_unique<WhileStmt>(std::move(condition), std::move(body));
    
    if (initializer != nullptr) {
        std::vector<std::unique_ptr<Stmt>> statements;
        statements.push_back(std::move(initializer));
        statements.push_back(std::move(body));
        body = std::make_unique<BlockStmt>(std::move(statements));
    }
    
    return body;
}

std::unique_ptr<Stmt> Parser::returnStatement() {
    Token keyword = previous();
    std::unique_ptr<Expr> value = nullptr;
    
    if (!check(TokenKind::Semicolon)) {
        value = expression();
    }
    
    consume(TokenKind::Semicolon, "Expect ';' after return value.");
    return std::make_unique<ReturnStmt>(keyword, std::move(value));
}

std::unique_ptr<Stmt> Parser::expressionStatement() {
    auto expr = expression();
    consume(TokenKind::Semicolon, "Expect ';' after expression.");
    return std::make_unique<ExpressionStmt>(std::move(expr));
}

std::unique_ptr<Stmt> Parser::blockStatement() {
    std::vector<std::unique_ptr<Stmt>> statements;
    
    while (!check(TokenKind::RightBrace) && !isAtEnd()) {
        statements.push_back(statement());
    }
    
    consume(TokenKind::RightBrace, "Expect '}' after block.");
    return std::make_unique<BlockStmt>(std::move(statements));
}

std::unique_ptr<Expr> Parser::expression() {
    return assignment();
}

std::unique_ptr<Expr> Parser::assignment() {
    auto expr = logicalOr();
    
    if (match(TokenKind::Equal)) {
        Token equals = previous();
        auto value = assignment();
        
        if (auto* varExpr = dynamic_cast<VariableExpr*>(expr.get())) {
            Token name = varExpr->name;
            return std::make_unique<AssignmentExpr>(name, std::move(value));
        }
        
        error(equals, "Invalid assignment target.");
    }
    
    return expr;
}

std::unique_ptr<Expr> Parser::logicalOr() {
    auto expr = logicalAnd();
    
    while (match(TokenKind::Or)) {
        Token op = previous();
        auto right = logicalAnd();
        expr = std::make_unique<BinaryExpr>(std::move(expr), op, std::move(right));
    }
    
    return expr;
}

std::unique_ptr<Expr> Parser::logicalAnd() {
    auto expr = equality();
    
    while (match(TokenKind::And)) {
        Token op = previous();
        auto right = equality();
        expr = std::make_unique<BinaryExpr>(std::move(expr), op, std::move(right));
    }
    
    return expr;
}

std::unique_ptr<Expr> Parser::equality() {
    auto expr = comparison();
    
    while (match(TokenKind::BangEqual) || match(TokenKind::EqualEqual)) {
        Token op = previous();
        auto right = comparison();
        expr = std::make_unique<BinaryExpr>(std::move(expr), op, std::move(right));
    }
    
    return expr;
}

std::unique_ptr<Expr> Parser::comparison() {
    auto expr = term();
    
    while (match(TokenKind::Less) || match(TokenKind::LessEqual) ||
           match(TokenKind::Greater) || match(TokenKind::GreaterEqual)) {
        Token op = previous();
        auto right = term();
        expr = std::make_unique<BinaryExpr>(std::move(expr), op, std::move(right));
    }
    
    return expr;
}

std::unique_ptr<Expr> Parser::term() {
    auto expr = factor();
    
    while (match(TokenKind::Minus) || match(TokenKind::Plus)) {
        Token op = previous();
        auto right = factor();
        expr = std::make_unique<BinaryExpr>(std::move(expr), op, std::move(right));
    }
    
    return expr;
}

std::unique_ptr<Expr> Parser::factor() {
    auto expr = unary();
    
    while (match(TokenKind::Slash) || match(TokenKind::Star)) {
        Token op = previous();
        auto right = unary();
        expr = std::make_unique<BinaryExpr>(std::move(expr), op, std::move(right));
    }
    
    return expr;
}

std::unique_ptr<Expr> Parser::unary() {
    if (match(TokenKind::Bang) || match(TokenKind::Minus)) {
        Token op = previous();
        auto right = unary();
        return std::make_unique<UnaryExpr>(op, std::move(right));
    }
    
    return call();
}

std::unique_ptr<Expr> Parser::call() {
    auto expr = primary();
    
    while (true) {
        if (match(TokenKind::LeftParen)) {
            expr = finishCall(std::move(expr));
        } else if (match(TokenKind::Dot)) {
            Token name = consume(TokenKind::Identifier, "Expect property name after '.'.");
            expr = std::make_unique<MemberExpr>(std::move(expr), name);
        } else {
            break;
        }
    }
    
    return expr;
}

std::unique_ptr<Expr> Parser::finishCall(std::unique_ptr<Expr> callee) {
    std::vector<std::unique_ptr<Expr>> arguments;
    
    if (!check(TokenKind::RightParen)) {
        do {
            arguments.push_back(expression());
        } while (match(TokenKind::Comma));
    }
    
    Token paren = consume(TokenKind::RightParen, "Expect ')' after arguments.");
    return std::make_unique<CallExpr>(std::move(callee), std::move(arguments));
}

std::unique_ptr<Expr> Parser::primary() {
    if (match(TokenKind::False)) return std::make_unique<LiteralExpr>(previous());
    if (match(TokenKind::True)) return std::make_unique<LiteralExpr>(previous());
    if (match(TokenKind::Null)) return std::make_unique<LiteralExpr>(previous());
    
    if (match(TokenKind::Number) || match(TokenKind::String)) {
        return std::make_unique<LiteralExpr>(previous());
    }
    
    if (match(TokenKind::Identifier)) {
        return std::make_unique<VariableExpr>(previous());
    }
    
    if (match(TokenKind::LeftParen)) {
        auto expr = expression();
        consume(TokenKind::RightParen, "Expect ')' after expression.");
        return expr;
    }
    
    if (match(TokenKind::JSXOpen)) {
        return jsx();
    }
    
    throw error(peek(), "Expect expression.");
}

std::unique_ptr<Expr> Parser::jsx() {
    Token tag = previous();
    std::vector<std::pair<Token, std::unique_ptr<Expr>>> props;
    std::vector<std::unique_ptr<Expr>> children;
    
    // Parse attributes
    while (!check(TokenKind::JSXClose) && !check(TokenKind::JSXSelfClose)) {
        Token name = consume(TokenKind::JSXIdentifier, "Expect JSX attribute name.");
        
        if (match(TokenKind::Equal)) {
            if (match(TokenKind::LeftBrace)) {
                auto value = expression();
                consume(TokenKind::RightBrace, "Expect '}' after JSX expression.");
                props.emplace_back(name, std::move(value));
            } else {
                auto value = primary();
                props.emplace_back(name, std::move(value));
            }
        } else {
            props.emplace_back(name, nullptr);
        }
    }
    
    // Parse children
    if (match(TokenKind::JSXClose)) {
        while (!check(TokenKind::JSXOpen) && !isAtEnd()) {
            if (match(TokenKind::JSXText)) {
                children.push_back(std::make_unique<LiteralExpr>(previous()));
            } else if (match(TokenKind::LeftBrace)) {
                auto expr = expression();
                consume(TokenKind::RightBrace, "Expect '}' after JSX expression.");
                children.push_back(std::move(expr));
            } else {
                children.push_back(jsx());
            }
        }
        
        consume(TokenKind::JSXOpen, "Expect closing JSX tag.");
        consume(TokenKind::Slash, "Expect '/' in closing JSX tag.");
        consume(TokenKind::JSXIdentifier, "Expect JSX tag name.");
        consume(TokenKind::JSXClose, "Expect '>' after JSX tag name.");
    } else {
        consume(TokenKind::JSXSelfClose, "Expect '/>' or '>' after JSX tag.");
    }
    
    return std::make_unique<JSXExpr>(tag, std::move(props), std::move(children));
}

} // namespace superjs 