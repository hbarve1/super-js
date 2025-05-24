#pragma once

#include <vector>
#include <memory>
#include "lexer/Lexer.h"
#include "parser/AST.h"

namespace superjs {

class Parser {
public:
    explicit Parser(const std::vector<Token>& tokens);

    // Main parsing method
    std::vector<std::unique_ptr<Statement>> parse();

private:
    // Helper methods
    bool isAtEnd() const;
    Token advance();
    bool check(TokenKind kind) const;
    bool match(TokenKind kind);
    Token peek() const;
    Token previous() const;
    Token consume(TokenKind kind, const std::string& message);

    // Parsing methods
    std::unique_ptr<Statement> parseStatement();
    std::unique_ptr<Statement> parseIfStatement();
    std::unique_ptr<Statement> parseWhileStatement();
    std::unique_ptr<Statement> parseForStatement();
    std::unique_ptr<Statement> parseBlockStatement();
    std::unique_ptr<Statement> parseFunctionDeclaration();
    std::unique_ptr<Statement> parseVariableDeclaration();
    std::unique_ptr<Statement> parseExpressionStatement();
    std::unique_ptr<Expression> parseExpression();
    std::unique_ptr<Expression> parseAssignment();
    std::unique_ptr<Expression> parseEquality();
    std::unique_ptr<Expression> parseComparison();
    std::unique_ptr<Expression> parseTerm();
    std::unique_ptr<Expression> parseFactor();
    std::unique_ptr<Expression> parseUnary();
    std::unique_ptr<Expression> parsePrimary();

    // Error handling
    void synchronize();

    std::vector<Token> tokens;
    size_t current;
};

} // namespace superjs 