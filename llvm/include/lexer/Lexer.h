#pragma once

#include <string>
#include <vector>
#include <memory>
#include "Token.h"
#include "TokenRecognizer.h"
#include "TokenClassifier.h"
#include "LexerUtils.h"

namespace superjs {

// Lexer class
class Lexer {
public:
    explicit Lexer(const std::string& source);
    
    // Get the next token
    Token nextToken();
    
    // Get all tokens
    std::vector<Token> tokenize();
    
private:
    std::string source;
    size_t current;
    size_t start;
    size_t line;
    size_t column;
    
    // Components
    std::unique_ptr<TokenRecognizer> recognizer;
    std::unique_ptr<TokenClassifier> classifier;
    
    // Helper methods
    char currentChar() const;
    char peek() const;
    char advance();
    bool isAtEnd() const;
    bool match(char expected);
    void skipWhitespace();
    
    // Token scanning methods
    Token scanIdentifier();
    Token scanNumber();
    Token scanString();
    Token scanTemplate();
    Token scanJSX();
    Token makeToken(TokenKind kind);
    Token errorToken(const std::string& message);
};

} // namespace superjs 