#pragma once

#include <memory>
#include <vector>
#include "lexer/Lexer.h"
#include "ast/AST.h"

namespace superjs {

class ExpressionParser {
public:
    explicit ExpressionParser(std::vector<Token>& tokens, size_t& current)
        : tokens(tokens), current(current) {}

    std::unique_ptr<Expression> parseExpression();
    std::unique_ptr<Expression> parseAssignment();
    std::unique_ptr<Expression> parseEquality();
    std::unique_ptr<Expression> parseComparison();
    std::unique_ptr<Expression> parseTerm();
    std::unique_ptr<Expression> parseFactor();
    std::unique_ptr<Expression> parseUnary();
    std::unique_ptr<Expression> parseCall();
    std::unique_ptr<Expression> parsePrimary();
    std::unique_ptr<Expression> parseFunctionExpression();
    std::unique_ptr<Expression> parseClassExpression();
    std::unique_ptr<Expression> parseJSXExpression();

private:
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
};

} // namespace superjs 