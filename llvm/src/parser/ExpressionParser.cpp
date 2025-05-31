#include "../../include/parser/ExpressionParser.h"
#include "../../include/ast/Expressions.h"
#include "../../include/ast/Statements.h"
#include "../../include/ast/Type.h"
#include "../../include/ast/Types.h"
#include <stdexcept>
#include <memory>
#include <string>
#include <vector>
#include <iostream>

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
    std::cerr << "ExpressionParser::parseExpression() - Current token: " << peek().text << " (kind: " << static_cast<int>(peek().kind) << ")" << std::endl;
    return parseAssignment();
}

std::unique_ptr<Expression> ExpressionParser::parseAssignment() {
    std::cerr << "ExpressionParser::parseAssignment() - Current token: " << peek().text << " (kind: " << static_cast<int>(peek().kind) << ")" << std::endl;
    auto expr = parseEquality();

    if (match(TokenKind::Equal)) {
        std::cerr << "Found assignment operator" << std::endl;
        auto value = parseAssignment();
        if (auto* varExpr = dynamic_cast<VariableExpression*>(expr.get())) {
            return std::make_unique<AssignmentExpression>(varExpr->name, std::move(value));
        }
        throw std::runtime_error("Invalid assignment target");
    }

    return expr;
}

std::unique_ptr<Expression> ExpressionParser::parseEquality() {
    std::cerr << "ExpressionParser::parseEquality() - Current token: " << peek().text << " (kind: " << static_cast<int>(peek().kind) << ")" << std::endl;
    auto expr = parseComparison();

    while (match(TokenKind::BangEqual) || match(TokenKind::EqualEqual)) {
        Token op = previous();
        auto right = parseComparison();
        expr = std::make_unique<BinaryExpression>(std::move(expr), op, std::move(right));
    }

    return expr;
}

std::unique_ptr<Expression> ExpressionParser::parseComparison() {
    std::cerr << "ExpressionParser::parseComparison() - Current token: " << peek().text << " (kind: " << static_cast<int>(peek().kind) << ")" << std::endl;
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
    std::cerr << "ExpressionParser::parseTerm() - Current token: " << peek().text << " (kind: " << static_cast<int>(peek().kind) << ")" << std::endl;
    auto expr = parseFactor();

    while (match(TokenKind::Minus) || match(TokenKind::Plus)) {
        Token op = previous();
        auto right = parseFactor();
        expr = std::make_unique<BinaryExpression>(std::move(expr), op, std::move(right));
    }

    return expr;
}

std::unique_ptr<Expression> ExpressionParser::parseFactor() {
    std::cerr << "ExpressionParser::parseFactor() - Current token: " << peek().text << " (kind: " << static_cast<int>(peek().kind) << ")" << std::endl;
    auto expr = parseUnary();

    while (match(TokenKind::Slash) || match(TokenKind::Star)) {
        Token op = previous();
        auto right = parseUnary();
        expr = std::make_unique<BinaryExpression>(std::move(expr), op, std::move(right));
    }

    return expr;
}

std::unique_ptr<Expression> ExpressionParser::parseUnary() {
    std::cerr << "parseUnary() - Current token: " << peek().text << " (kind: " << static_cast<int>(peek().kind) << ")" << std::endl;
    if (match(TokenKind::Bang) || match(TokenKind::Minus)) {
        Token op = previous();
        std::cerr << "Matched unary operator: " << op.text << " (kind: " << static_cast<int>(op.kind) << ")" << std::endl;
        auto right = parseUnary();
        return std::make_unique<UnaryExpression>(op, std::move(right));
    }
    return parseCall();
}

std::unique_ptr<Expression> ExpressionParser::parseCall() {
    std::cerr << "ExpressionParser::parseCall() - Current token: " << peek().text << " (kind: " << static_cast<int>(peek().kind) << ")" << std::endl;
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
            std::cerr << "Parsing argument " << arguments.size() + 1 << " in finishCall" << std::endl;
            arguments.push_back(parseExpression());
        } while (match(TokenKind::Comma));
    }

    Token paren = consume(TokenKind::RightParen, "Expect ')' after arguments.");
    return std::make_unique<CallExpression>(std::move(callee), paren, std::move(arguments));
}

std::unique_ptr<Expression> ExpressionParser::parsePrimary() {
    std::cerr << "parsePrimary() - Current token: " << peek().text << " (kind: " << static_cast<int>(peek().kind) << ")" << std::endl;
    if (match(TokenKind::False)) { std::cerr << "Matched literal: false" << std::endl; return std::make_unique<LiteralExpression>(previous()); }
    if (match(TokenKind::True)) { std::cerr << "Matched literal: true" << std::endl; return std::make_unique<LiteralExpression>(previous()); }
    if (match(TokenKind::Null)) { std::cerr << "Matched literal: null" << std::endl; return std::make_unique<LiteralExpression>(previous()); }

    if (match(TokenKind::Number) || match(TokenKind::String)) {
        std::cerr << "Matched literal: " << previous().text << std::endl;
        return std::make_unique<LiteralExpression>(previous());
    }

    if (match(TokenKind::Identifier)) {
        std::cerr << "Matched identifier: " << previous().text << std::endl;
        return std::make_unique<VariableExpression>(previous());
    }

    if (match(TokenKind::LeftParen)) {
        std::cerr << "Matched left paren, parsing grouping expression" << std::endl;
        auto expr = parseExpression();
        consume(TokenKind::RightParen, "Expect ')' after expression.");
        return std::make_unique<GroupingExpression>(std::move(expr));
    }

    if (check(TokenKind::Semicolon)) {
        std::cerr << "Found semicolon, returning nullptr from parsePrimary" << std::endl;
        return nullptr;
    }

    std::cerr << "Unexpected token in primary expression: " << peek().text << " (kind: " << static_cast<int>(peek().kind) << ")" << std::endl;
    error(peek(), "Expect expression.");
    return nullptr;
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

Token ExpressionParser::advance() {
    if (!isAtEnd()) {
        std::cerr << "Advancing from token: " << tokens[current].text << " (kind: " << static_cast<int>(tokens[current].kind) << ")" << std::endl;
        current++;
    }
    return previous();
}

Token ExpressionParser::consume(TokenKind kind, const std::string& message) {
    if (check(kind)) {
        std::cerr << "Consuming token: " << peek().text << " (kind: " << static_cast<int>(peek().kind) << ")" << std::endl;
        return advance();
    }
    throw error(peek(), message);
}

} // namespace superjs 