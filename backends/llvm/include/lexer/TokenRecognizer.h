#pragma once

#include "Token.h"
#include <string>

namespace superjs {

class TokenRecognizer {
public:
    explicit TokenRecognizer(const std::string& source);
    
    // Token scanning methods
    Token scanIdentifier();
    Token scanNumber();
    Token scanString();
    Token scanTemplate();
    Token scanJSX();
    
    // State access
    size_t getCurrent() const { return current; }
    size_t getStart() const { return start; }
    size_t getLine() const { return line; }
    size_t getColumn() const { return column; }
    
    void setCurrent(size_t value) { current = value; }
    void setStart(size_t value) { start = value; }
    void setLine(size_t value) { line = value; }
    void setColumn(size_t value) { column = value; }
    
    // Helper methods
    char currentChar() const;
    char peek() const;
    char advance();
    bool isAtEnd() const;
    bool match(char expected);
    void skipWhitespace();
    
private:
    const std::string& source;
    size_t current;
    size_t start;
    size_t line;
    size_t column;
    
    Token makeToken(TokenKind kind);
    Token errorToken(const std::string& message);
};

} // namespace superjs 