#pragma once

#include <memory>
#include <vector>
#include <string>
#include "../lexer/Token.h"
#include "AST.h"
#include "ExpressionParser.h"
#include "StatementParser.h"
#include "TypeParser.h"
#include "ParseError.h"

namespace superjs {

// Forward declarations
class Statement;

class Parser {
public:
    explicit Parser(std::vector<Token> tokens)
        : tokens(std::move(tokens)), current(0),
          exprParser(this->tokens, current),
          stmtParser(this->tokens, current, exprParser),
          typeParser(this->tokens, current) {}

    std::vector<std::unique_ptr<Statement>> parse();

    // Error handling
    bool hasErrors() const { return !errors_.empty(); }
    const std::vector<std::string>& getErrors() const { return errors_; }

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

    // Member variables
    std::vector<std::string> errors_;
};

} // namespace superjs 