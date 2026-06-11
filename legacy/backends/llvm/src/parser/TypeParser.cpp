#include "../../include/parser/TypeParser.h"
#include "../../include/parser/ParserBase.h"
#include "../../include/ast/Type.h"
#include "../../include/ast/Types.h"
#include <memory>
#include <string>
#include <vector>

namespace superjs {

TypeParser::TypeParser(ParserBase& parser)
    : parser(parser) {}

std::unique_ptr<Type> TypeParser::parseType() {
    return parseUnionType();
}

std::unique_ptr<Type> TypeParser::parseUnionType() {
    std::unique_ptr<Type> type = parseIntersectionType();
    while (match(TokenKind::BitwiseOr)) {
        std::unique_ptr<Type> right = parseIntersectionType();
        // You may want to implement a UnionType that takes two types
        // For now, just return the rightmost type for demonstration
        type = std::move(right);
    }
    return type;
}

std::unique_ptr<Type> TypeParser::parseIntersectionType() {
    std::unique_ptr<Type> type = parsePrimaryType();
    while (match(TokenKind::BitwiseAnd)) {
        std::unique_ptr<Type> right = parsePrimaryType();
        // You may want to implement an IntersectionType that takes two types
        // For now, just return the rightmost type for demonstration
        type = std::move(right);
    }
    return type;
}

std::unique_ptr<Type> TypeParser::parsePrimaryType() {
    if (match(TokenKind::Number)) {
        Token t = parser.publicPrevious();
        return std::make_unique<PrimitiveType>(t);
    }
    if (match(TokenKind::String)) {
        Token t = parser.publicPrevious();
        return std::make_unique<PrimitiveType>(t);
    }
    if (match(TokenKind::Boolean)) {
        Token t = parser.publicPrevious();
        return std::make_unique<PrimitiveType>(t);
    }
    if (match(TokenKind::Any)) {
        Token t = parser.publicPrevious();
        return std::make_unique<PrimitiveType>(t);
    }
    if (match(TokenKind::Unknown)) {
        Token t = parser.publicPrevious();
        return std::make_unique<PrimitiveType>(t);
    }
    if (match(TokenKind::Never)) {
        Token t = parser.publicPrevious();
        return std::make_unique<PrimitiveType>(t);
    }
    if (match(TokenKind::Void)) {
        Token t = parser.publicPrevious();
        return std::make_unique<PrimitiveType>(t);
    }
    if (match(TokenKind::Null)) {
        Token t = parser.publicPrevious();
        return std::make_unique<PrimitiveType>(t);
    }
    if (match(TokenKind::Undefined)) {
        Token t = parser.publicPrevious();
        return std::make_unique<PrimitiveType>(t);
    }
    if (match(TokenKind::Identifier)) {
        Token t = parser.publicPrevious();
        return std::make_unique<PrimitiveType>(t);
    }
    throw parser.publicError(parser.publicPeek(), "Expect type.");
}

bool TypeParser::match(TokenKind kind) {
    if (parser.publicCheck(kind)) {
        parser.publicAdvance();
        return true;
    }
    return false;
}

bool TypeParser::check(TokenKind kind) {
    return parser.publicCheck(kind);
}

Token TypeParser::consume(TokenKind kind, const std::string& message) {
    if (parser.publicCheck(kind)) return parser.publicAdvance();
    throw parser.publicError(parser.publicPeek(), message);
}

} // namespace superjs 