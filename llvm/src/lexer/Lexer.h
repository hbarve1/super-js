#pragma once

#include <string>
#include <vector>
#include <unordered_map>

namespace superjs {

// Token kinds
enum class TokenKind {
    // Single-character tokens
    LeftParen, RightParen, LeftBrace, RightBrace,
    Comma, Dot, Minus, Plus, Semicolon, Slash, Star,
    Colon, Arrow, Pipe, Less, Greater,

    // One or two character tokens
    Bang, BangEquals,
    Equals, EqualsEquals,
    LessEquals, GreaterEquals,

    // Literals
    Identifier, StringLiteral, NumberLiteral,
    True, False, Null,

    // Keywords
    Let, Const, Var,
    If, Else, While, For,
    Function, Return,
    Class, Import, Export,
    Type, Interface,

    // Type-related keywords
    Number, String, Boolean,
    Any, Unknown, Never,
    Object, Array,

    // End of file
    Eof
};

// Token structure
struct Token {
    TokenKind kind;
    std::string text;
    size_t line;
    size_t column;
    
    Token(TokenKind kind, const std::string& text, size_t line, size_t column)
        : kind(kind), text(text), line(line), column(column) {}
};

// Lexer class
class Lexer {
public:
    explicit Lexer(const std::string& source);
    
    // Get all tokens
    std::vector<Token> tokenize();
    
private:
    std::string source;
    size_t start;
    size_t current;
    size_t line;
    size_t column;
    
    // Helper methods
    bool isAtEnd() const;
    char advance();
    void skipWhitespace();
    void skipComment();
    Token scanToken();
    Token makeToken(TokenKind kind) const;
    Token makeErrorToken(const std::string& message) const;
    bool match(char expected);
    char peek() const;
    char peekNext() const;
    bool isDigit(char c) const;
    bool isAlpha(char c) const;
    bool isAlphaNumeric(char c) const;
    Token scanIdentifier();
    Token scanNumber();
    Token scanString();
    TokenKind identifierType() const;
    TokenKind checkKeyword(size_t start, size_t length, const std::string& rest, TokenKind type) const;
};

} // namespace superjs 