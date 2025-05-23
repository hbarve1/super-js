#pragma once

#include <string>
#include <vector>
#include <memory>
#include <unordered_map>

namespace superjs {

// Token kinds
enum class TokenKind {
    // Keywords
    Let, Const, Var, Function, Return, If, Else, While, For, In, Of,
    Class, Extends, New, This, Super, Import, Export, Default,
    Async, Await, Try, Catch, Finally, Throw, Type, Interface,
    Break, Continue, Delete, Typeof, Instanceof, Void,
    Private, Protected, Public, Static, Readonly, Abstract,
    
    // Operators
    Plus, Minus, Star, Slash, Percent, Equal, EqualEqual, BangEqual,
    Less, LessEqual, Greater, GreaterEqual, And, Or, Bang,
    PlusPlus, MinusMinus, PlusEqual, MinusEqual, StarEqual, SlashEqual,
    
    // JSX
    JSXOpen, JSXClose, JSXSelfClose, JSXIdentifier, JSXText,
    
    // Literals
    Number, String, TemplateStart, TemplateMiddle, TemplateEnd,
    True, False, Null, Undefined,
    
    // Special
    Identifier, Dot, Comma, Semicolon, Colon, Question, Arrow,
    LeftParen, RightParen, LeftBrace, RightBrace, LeftBracket, RightBracket,
    EndOfFile, Error,
    Boolean
};

// Token structure
struct Token {
    TokenKind kind;
    std::string text;
    size_t line;
    size_t column;
    
    Token() : kind(TokenKind::Error), text(""), line(0), column(0) {}
    Token(TokenKind k, const std::string& t, size_t l, size_t c)
        : kind(k), text(t), line(l), column(c) {}
};

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