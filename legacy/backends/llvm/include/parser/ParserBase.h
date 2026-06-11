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

    // Public forwarding methods for composition
    Token publicPeek() const { return peek(); }
    Token publicPrevious() const { return previous(); }
    bool publicCheck(TokenKind kind) const { return check(kind); }
    Token publicAdvance() { return advance(); }
    ParseError publicError(const Token& token, const std::string& message) { return error(token, message); }

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