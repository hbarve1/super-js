#include "../../include/parser/ExpressionParser.h"
#include "../../include/ast/Expressions.h"
#include "../../include/ast/Statements.h"
#include "../../include/ast/Type.h"
#include "../../include/ast/Types.h"
#include <stdexcept>
#include <memory>
#include <string>
#include <vector>

namespace superjs {

// Forward declarations
class Expression;
class LiteralExpression;
class VariableExpression;
class GroupingExpression;
class GetExpression;
class AssignmentExpression;
class BinaryExpression;
class UnaryExpression;

std::unique_ptr<Expression> ExpressionParser::parseExpression() {
    return parseAssignment();
}

std::unique_ptr<Expression> ExpressionParser::parseAssignment() {
    auto expr = parseEquality();

    if (match(TokenKind::Equal)) {
        Token equals = previous();
        auto value = parseAssignment();

        if (auto* varExpr = dynamic_cast<VariableExpression*>(expr.get())) {
            return std::make_unique<AssignmentExpression>(varExpr->name, std::move(value));
        }

        error(equals, "Invalid assignment target.");
    }

    return expr;
}

std::unique_ptr<Expression> ExpressionParser::parseEquality() {
    auto expr = parseComparison();

    while (match(TokenKind::BangEqual) || match(TokenKind::EqualEqual)) {
        Token op = previous();
        auto right = parseComparison();
        expr = std::make_unique<BinaryExpression>(std::move(expr), op, std::move(right));
    }

    return expr;
}

std::unique_ptr<Expression> ExpressionParser::parseComparison() {
    auto expr = parseTerm();

    while (match(TokenKind::Greater) || match(TokenKind::GreaterEqual) ||
           match(TokenKind::Less) || match(TokenKind::LessEqual)) {
        Token op = previous();
        auto right = parseTerm();
        expr = std::make_unique<BinaryExpression>(std::move(expr), op, std::move(right));
    }

    return expr;
}

std::unique_ptr<Expression> ExpressionParser::parseTerm() {
    auto expr = parseFactor();

    while (match(TokenKind::Minus) || match(TokenKind::Plus)) {
        Token op = previous();
        auto right = parseFactor();
        expr = std::make_unique<BinaryExpression>(std::move(expr), op, std::move(right));
    }

    return expr;
}

std::unique_ptr<Expression> ExpressionParser::parseFactor() {
    auto expr = parseUnary();

    while (match(TokenKind::Slash) || match(TokenKind::Star)) {
        Token op = previous();
        auto right = parseUnary();
        expr = std::make_unique<BinaryExpression>(std::move(expr), op, std::move(right));
    }

    return expr;
}

std::unique_ptr<Expression> ExpressionParser::parseUnary() {
    if (match(TokenKind::Bang) || match(TokenKind::Minus)) {
        Token op = previous();
        auto right = parseUnary();
        return std::make_unique<UnaryExpression>(op, std::move(right));
    }

    return parseCall();
}

std::unique_ptr<Expression> ExpressionParser::parseCall() {
    auto expr = parsePrimary();

    while (true) {
        if (match(TokenKind::LeftParen)) {
            expr = finishCall(std::move(expr));
        } else if (match(TokenKind::Dot)) {
            Token name = consume(TokenKind::Identifier, "Expect property name after '.'.");
            expr = std::make_unique<GetExpression>(std::move(expr), name);
        } else {
            break;
        }
    }

    return expr;
}

std::unique_ptr<Expression> ExpressionParser::finishCall(std::unique_ptr<Expression> callee) {
    std::vector<std::unique_ptr<Expression>> arguments;
    if (!check(TokenKind::RightParen)) {
        do {
            if (arguments.size() >= 255) {
                error(peek(), "Cannot have more than 255 arguments.");
            }
            arguments.push_back(parseExpression());
        } while (match(TokenKind::Comma));
    }

    Token paren = consume(TokenKind::RightParen, "Expect ')' after arguments.");
    return std::make_unique<CallExpression>(std::move(callee), paren, std::move(arguments));
}

std::unique_ptr<Expression> ExpressionParser::parsePrimary() {
    if (match(TokenKind::False)) return std::make_unique<LiteralExpression>(Token(TokenKind::False, "false", peek().line, peek().column));
    if (match(TokenKind::True)) return std::make_unique<LiteralExpression>(Token(TokenKind::True, "true", peek().line, peek().column));
    if (match(TokenKind::Null)) return std::make_unique<LiteralExpression>(Token(TokenKind::Null, "null", peek().line, peek().column));

    if (match(TokenKind::Number) || match(TokenKind::String)) {
        return std::make_unique<LiteralExpression>(previous());
    }

    if (match(TokenKind::Identifier)) {
        return std::make_unique<VariableExpression>(previous());
    }

    if (match(TokenKind::LeftParen)) {
        auto expr = parseExpression();
        consume(TokenKind::RightParen, "Expect ')' after expression.");
        return std::make_unique<GroupingExpression>(std::move(expr));
    }

    throw error(peek(), "Expect expression.");
}

std::unique_ptr<Expression> ExpressionParser::parseFunctionExpression() {
    consume(TokenKind::LeftParen, "Expect '(' after 'function'.");
    std::vector<Token> parameters;
    if (!check(TokenKind::RightParen)) {
        do {
            if (parameters.size() >= 255) {
                error(peek(), "Cannot have more than 255 parameters.");
            }
            parameters.push_back(consume(TokenKind::Identifier, "Expect parameter name."));
        } while (match(TokenKind::Comma));
    }
    consume(TokenKind::LeftBrace, "Expect '{' before function body.");
    auto body = std::make_unique<BlockStatement>(std::vector<std::unique_ptr<Statement>>());
    return std::make_unique<FunctionExpression>(
        std::move(parameters),
        std::vector<std::unique_ptr<Type>>{},
        nullptr,
        std::move(body)
    );
}

std::unique_ptr<Expression> ExpressionParser::parseClassExpression() {
    Token name = consume(TokenKind::Identifier, "Expect class name.");
    std::unique_ptr<VariableExpression> superclass = nullptr;
    if (match(TokenKind::Less)) {
        consume(TokenKind::Identifier, "Expect superclass name.");
        superclass = std::make_unique<VariableExpression>(previous());
    }
    consume(TokenKind::LeftBrace, "Expect '{' before class body.");
    std::vector<std::unique_ptr<Expression>> methods;
    while (!check(TokenKind::RightBrace) && !isAtEnd()) {
        methods.push_back(parseFunctionExpression());
    }
    consume(TokenKind::RightBrace, "Expect '}' after class body.");
    return std::make_unique<ClassExpression>(std::move(superclass), std::move(methods));
}

std::unique_ptr<Expression> ExpressionParser::parseJSXExpression() {
    // TODO: Implement JSX parsing
    throw error(peek(), "JSX parsing not implemented yet.");
}

// Helper methods
bool ExpressionParser::match(TokenKind kind) {
    if (check(kind)) {
        advance();
        return true;
    }
    return false;
}

bool ExpressionParser::check(TokenKind kind) const {
    if (isAtEnd()) return false;
    return peek().kind == kind;
}

Token ExpressionParser::advance() {
    if (!isAtEnd()) current++;
    return previous();
}

Token ExpressionParser::peek() const {
    return tokens[current];
}

Token ExpressionParser::previous() const {
    return tokens[current - 1];
}

bool ExpressionParser::isAtEnd() const {
    return peek().kind == TokenKind::EndOfFile;
}

Token ExpressionParser::consume(TokenKind kind, const std::string& message) {
    if (check(kind)) return advance();
    throw error(peek(), message);
}

ParseError ExpressionParser::error(const Token& token, const std::string& message) {
    return ParseError(message);
}

} // namespace superjs 