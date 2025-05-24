#include "parser/Parser.h"
#include <stdexcept>

namespace superjs {

Parser::Parser(const std::vector<Token>& tokens)
    : tokens(tokens), current(0) {}

std::vector<std::unique_ptr<Statement>> Parser::parse() {
    std::vector<std::unique_ptr<Statement>> statements;
    while (!isAtEnd()) {
        statements.push_back(parseStatement());
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

Token Parser::peek() const {
    return tokens[current];
}

Token Parser::previous() const {
    return tokens[current - 1];
}

Token Parser::consume(TokenKind kind, const std::string& message) {
    if (check(kind)) return advance();
    throw std::runtime_error(message);
}

std::unique_ptr<Statement> Parser::parseStatement() {
    if (match(TokenKind::If)) return parseIfStatement();
    if (match(TokenKind::While)) return parseWhileStatement();
    if (match(TokenKind::For)) return parseForStatement();
    if (match(TokenKind::LeftBrace)) return parseBlockStatement();
    if (match(TokenKind::Function)) return parseFunctionDeclaration();
    if (match(TokenKind::Let) || match(TokenKind::Const) || match(TokenKind::Var)) {
        return parseVariableDeclaration();
    }
    return parseExpressionStatement();
}

std::unique_ptr<Statement> Parser::parseExpressionStatement() {
    auto expr = parseExpression();
    consume(TokenKind::Semicolon, "Expect ';' after expression.");
    return std::make_unique<ExpressionStatement>(std::move(expr));
}

std::unique_ptr<Statement> Parser::parseIfStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'if'.");
    auto condition = parseExpression();
    consume(TokenKind::RightParen, "Expect ')' after if condition.");

    auto thenBranch = parseStatement();
    std::unique_ptr<Statement> elseBranch;
    if (match(TokenKind::Else)) {
        elseBranch = parseStatement();
    }

    return std::make_unique<IfStatement>(std::move(condition),
                                       std::move(thenBranch),
                                       std::move(elseBranch));
}

std::unique_ptr<Statement> Parser::parseWhileStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'while'.");
    auto condition = parseExpression();
    consume(TokenKind::RightParen, "Expect ')' after while condition.");

    auto body = parseStatement();

    return std::make_unique<WhileStatement>(std::move(condition),
                                          std::move(body));
}

std::unique_ptr<Statement> Parser::parseBlockStatement() {
    std::vector<std::unique_ptr<Statement>> statements;

    while (!check(TokenKind::RightBrace) && !isAtEnd()) {
        statements.push_back(parseStatement());
    }

    consume(TokenKind::RightBrace, "Expect '}' after block.");
    return std::make_unique<BlockStatement>(std::move(statements));
}

std::unique_ptr<Expression> Parser::parseExpression() {
    return parseAssignment();
}

std::unique_ptr<Expression> Parser::parseAssignment() {
    auto expr = parseEquality();

    if (match(TokenKind::Equal)) {
        auto value = parseAssignment();

        if (auto* var = dynamic_cast<IdentifierExpression*>(expr.get())) {
            return std::make_unique<AssignmentExpression>(var->name, std::move(value));
        }

        throw std::runtime_error("Invalid assignment target.");
    }

    return expr;
}

std::unique_ptr<Expression> Parser::parseEquality() {
    auto expr = parseComparison();

    while (match(TokenKind::BangEqual) || match(TokenKind::EqualEqual)) {
        auto op = previous();
        auto right = parseComparison();
        expr = std::make_unique<BinaryExpression>(std::move(expr), op, std::move(right));
    }

    return expr;
}

std::unique_ptr<Expression> Parser::parseComparison() {
    auto expr = parseTerm();

    while (match(TokenKind::Less) || match(TokenKind::LessEqual) ||
           match(TokenKind::Greater) || match(TokenKind::GreaterEqual)) {
        auto op = previous();
        auto right = parseTerm();
        expr = std::make_unique<BinaryExpression>(std::move(expr), op, std::move(right));
    }

    return expr;
}

std::unique_ptr<Expression> Parser::parseTerm() {
    auto expr = parseFactor();

    while (match(TokenKind::Minus) || match(TokenKind::Plus)) {
        auto op = previous();
        auto right = parseFactor();
        expr = std::make_unique<BinaryExpression>(std::move(expr), op, std::move(right));
    }

    return expr;
}

std::unique_ptr<Expression> Parser::parseFactor() {
    auto expr = parseUnary();

    while (match(TokenKind::Slash) || match(TokenKind::Star)) {
        auto op = previous();
        auto right = parseUnary();
        expr = std::make_unique<BinaryExpression>(std::move(expr), op, std::move(right));
    }

    return expr;
}

std::unique_ptr<Expression> Parser::parseUnary() {
    if (match(TokenKind::Bang) || match(TokenKind::Minus)) {
        auto op = previous();
        auto right = parseUnary();
        return std::make_unique<UnaryExpression>(op, std::move(right));
    }

    return parsePrimary();
}

std::unique_ptr<Expression> Parser::parsePrimary() {
    if (match(TokenKind::False)) return std::make_unique<LiteralExpression>(previous());
    if (match(TokenKind::True)) return std::make_unique<LiteralExpression>(previous());
    if (match(TokenKind::Null)) return std::make_unique<LiteralExpression>(previous());

    if (match(TokenKind::Number) || match(TokenKind::String)) {
        return std::make_unique<LiteralExpression>(previous());
    }

    if (match(TokenKind::Identifier)) {
        return std::make_unique<IdentifierExpression>(previous());
    }

    if (match(TokenKind::LeftParen)) {
        auto expr = parseExpression();
        consume(TokenKind::RightParen, "Expect ')' after expression.");
        return expr;
    }

    throw std::runtime_error("Expect expression.");
}

void Parser::synchronize() {
    advance();

    while (!isAtEnd()) {
        if (previous().kind == TokenKind::Semicolon) return;

        switch (peek().kind) {
            case TokenKind::Class:
            case TokenKind::Function:
            case TokenKind::Var:
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

std::unique_ptr<Statement> Parser::parseForStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'for'.");

    // Parse initializer
    std::unique_ptr<Statement> initializer;
    if (match(TokenKind::Semicolon)) {
        initializer = nullptr;
    } else if (match(TokenKind::Let) || match(TokenKind::Const) || match(TokenKind::Var)) {
        initializer = parseVariableDeclaration();
    } else {
        initializer = parseExpressionStatement();
    }

    // Parse condition
    std::unique_ptr<Expression> condition;
    if (!check(TokenKind::Semicolon)) {
        condition = parseExpression();
    }
    consume(TokenKind::Semicolon, "Expect ';' after loop condition.");

    // Parse increment
    std::unique_ptr<Expression> increment;
    if (!check(TokenKind::RightParen)) {
        increment = parseExpression();
    }
    consume(TokenKind::RightParen, "Expect ')' after for clauses.");

    // Parse body
    auto body = parseStatement();

    // If increment exists, append it to the end of the loop body
    if (increment) {
        std::vector<std::unique_ptr<Statement>> bodyStmts;
        if (auto* block = dynamic_cast<BlockStatement*>(body.get())) {
            bodyStmts = std::move(block->statements);
        } else {
            bodyStmts.push_back(std::move(body));
        }
        bodyStmts.push_back(std::make_unique<ExpressionStatement>(std::move(increment)));
        body = std::make_unique<BlockStatement>(std::move(bodyStmts));
    }

    // If no condition, use 'true' as the condition
    if (!condition) {
        Token trueToken;
        trueToken.kind = TokenKind::True;
        condition = std::make_unique<LiteralExpression>(trueToken);
    }

    // Create the while loop
    auto whileStmt = std::make_unique<WhileStatement>(std::move(condition), std::move(body));

    // If initializer exists, wrap everything in a block
    if (initializer) {
        std::vector<std::unique_ptr<Statement>> stmts;
        stmts.push_back(std::move(initializer));
        stmts.push_back(std::move(whileStmt));
        return std::make_unique<BlockStatement>(std::move(stmts));
    } else {
        return whileStmt;
    }
}

std::unique_ptr<Statement> Parser::parseFunctionDeclaration() {
    // Parse the function name
    Token name = consume(TokenKind::Identifier, "Expect function name.");
    
    // Parse the parameter list
    consume(TokenKind::LeftParen, "Expect '(' after function name.");
    std::vector<Token> parameters;
    
    if (!check(TokenKind::RightParen)) {
        do {
            if (parameters.size() >= 255) {
                throw std::runtime_error("Cannot have more than 255 parameters.");
            }
            
            parameters.push_back(consume(TokenKind::Identifier, "Expect parameter name."));
        } while (match(TokenKind::Comma));
    }
    
    consume(TokenKind::RightParen, "Expect ')' after parameters.");
    
    // Parse the function body
    consume(TokenKind::LeftBrace, "Expect '{' before function body.");
    auto body = std::unique_ptr<BlockStatement>(dynamic_cast<BlockStatement*>(parseBlockStatement().release()));
    if (!body) {
        throw std::runtime_error("Function body must be a block statement.");
    }
    
    return std::make_unique<FunctionDeclaration>(name, std::move(parameters), std::move(body));
}

std::unique_ptr<Statement> Parser::parseVariableDeclaration() {
    // Get the declaration keyword (let, const, var)
    Token keyword = previous();
    
    // Parse the variable name
    Token name = consume(TokenKind::Identifier, "Expect variable name.");
    
    // Parse the initializer if present
    std::unique_ptr<Expression> initializer;
    if (match(TokenKind::Equal)) {
        initializer = parseExpression();
    }
    
    // Consume the semicolon
    consume(TokenKind::Semicolon, "Expect ';' after variable declaration.");
    
    return std::make_unique<VariableDeclaration>(name, std::move(initializer));
}

} // namespace superjs 