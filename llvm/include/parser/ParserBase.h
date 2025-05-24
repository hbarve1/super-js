#pragma once

#include "../lexer/Token.h"
#include "ParseError.h"
#include <vector>
#include <string>

namespace superjs {

class ParserBase {
public:
    explicit ParserBase(std::vector<Token>& tokens, size_t& current)
        : tokens(tokens), current(current) {}

protected:
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
    void synchronize();
};

} // namespace superjs 