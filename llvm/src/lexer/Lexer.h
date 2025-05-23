#pragma once

#include <string>
#include <vector>
#include <memory>
#include <optional>

namespace superjs {

enum class TokenKind {
    // Keywords
    Let, Const, Var, Function, Class, Interface, Type,
    If, Else, While, For, Return, Break, Continue,
    Try, Catch, Finally, Throw,
    New, Delete, Typeof, Instanceof, Void,
    Private, Protected, Public, Static, Readonly, Abstract,
    Async, Await,

    // Operators
    Plus, Minus, Star, Slash, Percent,
    Equal, EqualEqual, Bang, BangEqual,
    Less, LessEqual, Greater, GreaterEqual,
    And, Or, Question, Colon, Dot, Comma,
    Semicolon, Arrow,

    // JSX
    JSXOpen, JSXClose, JSXSelfClose,

    // Literals
    Identifier, String, Number, Boolean, Null, Undefined,
    TemplateStart, TemplateEnd, TemplateExpr,

    // Special
    LeftParen, RightParen,
    LeftBrace, RightBrace,
    LeftBracket, RightBracket,
    EndOfFile, Error
};

struct Token {
    TokenKind kind;
    std::string text;
    size_t line;
    size_t column;
};

class Lexer {
public:
    explicit Lexer(std::string source);
    Token nextToken();
    std::vector<Token> tokenize();

private:
    std::string source;
    size_t position;
    size_t line;
    size_t column;

    char current() const;
    char peek() const;
    void advance();
    bool isAtEnd() const;
    void skipWhitespace();
    Token makeToken(TokenKind kind) const;
    Token makeError(const std::string& message) const;
    
    Token scanIdentifier();
    Token scanNumber();
    Token scanString();
    Token scanTemplate();
    Token scanJSX();
};

} // namespace superjs 