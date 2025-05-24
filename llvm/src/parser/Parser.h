#pragma once

#include <vector>
#include <memory>
#include <string>
#include "lexer/Lexer.h"
#include "ast/AST.h"
#include "parser/ExpressionParser.h"
#include "parser/StatementParser.h"
#include "parser/TypeParser.h"

namespace superjs {

class ParseError : public std::runtime_error {
public:
    explicit ParseError(const std::string& message) : std::runtime_error(message) {}
};

class Parser {
public:
    explicit Parser(std::vector<Token> tokens) 
        : tokens(std::move(tokens)), current(0),
          exprParser(this->tokens, this->current),
          stmtParser(this->tokens, this->current),
          typeParser(this->tokens, this->current) {}

    std::vector<std::unique_ptr<Statement>> parse();

private:
    std::vector<Token> tokens;
    size_t current;
    ExpressionParser exprParser;
    StatementParser stmtParser;
    TypeParser typeParser;

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