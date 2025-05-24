#pragma once

#include <vector>
#include <memory>
#include <string>
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
    std::unique_ptr<Statement> parseReturnStatement();
    std::unique_ptr<Statement> parseClassDeclaration();
    std::unique_ptr<Statement> parseImportStatement();
    std::unique_ptr<Statement> parseExportStatement();
    std::unique_ptr<Statement> parseTypeDeclaration();
    std::unique_ptr<Statement> parseInterfaceDeclaration();
    std::unique_ptr<Expression> parseExpression();
    std::unique_ptr<Expression> parseAssignment();
    std::unique_ptr<Expression> parseEquality();
    std::unique_ptr<Expression> parseComparison();
    std::unique_ptr<Expression> parseTerm();
    std::unique_ptr<Expression> parseFactor();
    std::unique_ptr<Expression> parseUnary();
    std::unique_ptr<Expression> parsePrimary();
    std::unique_ptr<Expression> parseFunctionExpression();
    std::unique_ptr<Expression> parseClassExpression();
    std::unique_ptr<Expression> parseJSXExpression();

    // Type parsing methods
    std::unique_ptr<Type> parseType();
    std::unique_ptr<Type> parsePrimitiveType();
    std::unique_ptr<Type> parseObjectType();
    std::unique_ptr<Type> parseFunctionType();
    std::unique_ptr<Type> parseGenericType();
    std::unique_ptr<Type> parseUnionType();

    // Error handling
    void synchronize();

    std::vector<Token> tokens;
    size_t current;
};

} // namespace superjs 