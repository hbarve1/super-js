#pragma once

#include <memory>
#include <vector>
#include "lexer/Lexer.h"
#include "ast/AST.h"

namespace superjs {

class TypeParser {
public:
    explicit TypeParser(std::vector<Token>& tokens, size_t& current)
        : tokens(tokens), current(current) {}

    std::unique_ptr<Type> parseType();
    std::unique_ptr<Type> parsePrimitiveType();
    std::unique_ptr<Type> parseObjectType();
    std::unique_ptr<Type> parseFunctionType();
    std::unique_ptr<Type> parseGenericType();
    std::unique_ptr<Type> parseUnionType();

private:
    std::vector<Token>& tokens;
    size_t& current;

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