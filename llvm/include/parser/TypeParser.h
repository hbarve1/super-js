#pragma once

#include "ParserBase.h"
#include "../ast/Type.h"
#include "../ast/Types.h"
#include <memory>
#include <vector>
#include <string>
#include "../lexer/Token.h"
#include "AST.h"
#include "ParseError.h"

namespace superjs {

// Forward declarations
class Type;

class TypeParser : public ParserBase {
public:
    explicit TypeParser(std::vector<Token>& tokens, size_t& current)
        : ParserBase(tokens, current) {}

    std::unique_ptr<Type> parseType();
    std::unique_ptr<Type> parsePrimitiveType();
    std::unique_ptr<Type> parseObjectType();
    std::unique_ptr<Type> parseFunctionType();
    std::unique_ptr<Type> parseGenericType();
    std::unique_ptr<Type> parseUnionType();
    std::unique_ptr<Type> parseIntersectionType();
    std::unique_ptr<Type> parseArrayType();

private:
    // Helper methods
    bool match(TokenKind kind);
    bool check(TokenKind kind) const;
    Token advance();
    Token peek() const;
    Token previous() const;
    bool isAtEnd() const;
    Token consume(TokenKind kind, const std::string& message);
    ParseError error(const Token& token, const std::string& message);
};

} // namespace superjs 