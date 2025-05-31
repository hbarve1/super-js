#pragma once

#include <string>

namespace superjs {

// Token kinds
enum class TokenKind {
    // Keywords
    Let = 1, Const, Var, Function, Return, If, Else, While, For, In, Of,
    Class, Extends, New, This, Super, Import, Export, Default,
    Async, Await, Try, Catch, Finally, Throw, Type, Interface,
    Break, Continue, Delete, Typeof, Instanceof, Void,
    Private, Protected, Public, Static, Readonly, Abstract,
    
    // Operators
    Plus, Minus, Star, Slash, Percent, Equal, EqualEqual, BangEqual,
    Less, LessEqual, Greater, GreaterEqual, And, Or, Bang,
    PlusPlus, MinusMinus, PlusEqual, MinusEqual, StarEqual, SlashEqual,
    BitwiseAnd, BitwiseOr, BitwiseXor, BitwiseNot,
    
    // JSX
    JSXOpen, JSXClose, JSXSelfClose, JSXIdentifier, JSXText,
    
    // Literals
    Number = 41, String, TemplateStart, TemplateMiddle, TemplateEnd,
    True, False, Null, Undefined,
    
    // Special
    Identifier, Dot, Comma, Semicolon, Colon, Question, Arrow,
    LeftParen, RightParen, LeftBrace, RightBrace, LeftBracket, RightBracket,
    EndOfFile, Error,
    Boolean,
    Any, Unknown, Never, Object, Array,
    At, Hash
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

} // namespace superjs 