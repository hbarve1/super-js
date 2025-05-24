#include "../../include/parser/TypeParser.h"
#include <memory>

namespace superjs {

std::unique_ptr<Type> TypeParser::parseType() {
    if (match(TokenKind::Identifier)) {
        Token name = previous();
        if (match(TokenKind::Less)) {
            return parseGenericType();
        }
        return std::make_unique<GenericType>(name.text, std::vector<std::unique_ptr<Type>>{});
    }

    if (match(TokenKind::LeftBrace)) {
        return parseObjectType();
    }

    if (match(TokenKind::LeftParen)) {
        return parseFunctionType();
    }

    return parsePrimitiveType();
}

std::unique_ptr<Type> TypeParser::parsePrimitiveType() {
    if (match(TokenKind::Number)) return std::make_unique<PrimitiveType>(PrimitiveType::Kind::Number);
    if (match(TokenKind::String)) return std::make_unique<PrimitiveType>(PrimitiveType::Kind::String);
    if (match(TokenKind::Boolean)) return std::make_unique<PrimitiveType>(PrimitiveType::Kind::Boolean);
    if (match(TokenKind::Void)) return std::make_unique<PrimitiveType>(PrimitiveType::Kind::Void);
    if (match(TokenKind::Any)) return std::make_unique<PrimitiveType>(PrimitiveType::Kind::Any);

    throw error(peek(), "Expect type.");
}

std::unique_ptr<Type> TypeParser::parseObjectType() {
    std::vector<std::pair<Token, std::unique_ptr<Type>>> properties;

    if (!check(TokenKind::RightBrace)) {
        do {
            Token name = consume(TokenKind::Identifier, "Expect property name.");
            consume(TokenKind::Colon, "Expect ':' after property name.");
            auto type = parseType();
            properties.push_back({name, std::move(type)});
        } while (match(TokenKind::Comma));
    }

    consume(TokenKind::RightBrace, "Expect '}' after object type.");
    return std::make_unique<ObjectType>(std::move(properties));
}

std::unique_ptr<Type> TypeParser::parseFunctionType() {
    std::vector<std::unique_ptr<Type>> parameterTypes;

    if (!check(TokenKind::RightParen)) {
        do {
            parameterTypes.push_back(parseType());
        } while (match(TokenKind::Comma));
    }

    consume(TokenKind::RightParen, "Expect ')' after function parameters.");
    consume(TokenKind::Arrow, "Expect '->' after function parameters.");
    auto returnType = parseType();

    return std::make_unique<FunctionType>(std::move(parameterTypes), std::move(returnType));
}

std::unique_ptr<Type> TypeParser::parseGenericType() {
    std::vector<std::unique_ptr<Type>> typeArguments;

    if (!check(TokenKind::Greater)) {
        do {
            typeArguments.push_back(parseType());
        } while (match(TokenKind::Comma));
    }

    consume(TokenKind::Greater, "Expect '>' after generic type arguments.");
    Token name = previous();
    return std::make_unique<GenericType>(name.text, std::move(typeArguments));
}

// Helper methods
bool TypeParser::match(TokenKind kind) {
    if (check(kind)) {
        advance();
        return true;
    }
    return false;
}

bool TypeParser::check(TokenKind kind) const {
    if (isAtEnd()) return false;
    return peek().kind == kind;
}

Token TypeParser::advance() {
    if (!isAtEnd()) current++;
    return previous();
}

Token TypeParser::peek() const {
    return tokens[current];
}

Token TypeParser::previous() const {
    return tokens[current - 1];
}

bool TypeParser::isAtEnd() const {
    return peek().kind == TokenKind::EndOfFile;
}

Token TypeParser::consume(TokenKind kind, const std::string& message) {
    if (check(kind)) return advance();
    throw error(peek(), message);
}

ParseError TypeParser::error(const Token& token, const std::string& message) {
    return ParseError(message);
}

} // namespace superjs 