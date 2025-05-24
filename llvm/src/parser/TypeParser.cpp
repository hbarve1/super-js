#include "../../include/parser/TypeParser.h"
#include "../../include/ast/Type.h"
#include "../../include/ast/Types.h"
#include <memory>

namespace superjs {

std::unique_ptr<Type> TypeParser::parseType() {
    if (match(TokenKind::Identifier)) {
        Token name = previous();
        if (match(TokenKind::Less)) {
            return parseGenericType();
        }
        return std::make_unique<PrimitiveType>(name);
    }

    if (match(TokenKind::LeftBrace)) {
        return parseObjectType();
    }

    if (match(TokenKind::LeftParen)) {
        return parseFunctionType();
    }

    if (match(TokenKind::LeftBracket)) {
        return parseArrayType();
    }

    if (match(TokenKind::Pipe)) {
        return parseUnionType();
    }

    if (match(TokenKind::Ampersand)) {
        return parseIntersectionType();
    }

    return parsePrimitiveType();
}

std::unique_ptr<Type> TypeParser::parsePrimitiveType() {
    if (match(TokenKind::Number)) return std::make_unique<PrimitiveType>(Token(TokenKind::Number, "number", peek().line, peek().column));
    if (match(TokenKind::String)) return std::make_unique<PrimitiveType>(Token(TokenKind::String, "string", peek().line, peek().column));
    if (match(TokenKind::Boolean)) return std::make_unique<PrimitiveType>(Token(TokenKind::Boolean, "boolean", peek().line, peek().column));
    if (match(TokenKind::Void)) return std::make_unique<PrimitiveType>(Token(TokenKind::Void, "void", peek().line, peek().column));
    if (match(TokenKind::Any)) return std::make_unique<PrimitiveType>(Token(TokenKind::Any, "any", peek().line, peek().column));

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
    return std::make_unique<GenericType>(name, std::move(typeArguments));
}

std::unique_ptr<Type> TypeParser::parseUnionType() {
    std::vector<std::unique_ptr<Type>> types;
    types.push_back(parseType());

    while (match(TokenKind::Pipe)) {
        types.push_back(parseType());
    }

    return std::make_unique<UnionType>(std::move(types));
}

std::unique_ptr<Type> TypeParser::parseIntersectionType() {
    std::vector<std::unique_ptr<Type>> types;
    types.push_back(parseType());

    while (match(TokenKind::Ampersand)) {
        types.push_back(parseType());
    }

    return std::make_unique<IntersectionType>(std::move(types));
}

std::unique_ptr<Type> TypeParser::parseArrayType() {
    auto elementType = parseType();
    consume(TokenKind::RightBracket, "Expect ']' after array type.");
    return std::make_unique<ArrayType>(std::move(elementType));
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