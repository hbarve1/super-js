#pragma once

#include <vector>
#include <memory>
#include <string>
#include "../lexer/Lexer.h"
#include "AST.h"

namespace superjs {

class Parser {
public:
    explicit Parser(const std::vector<Token>& tokens);

    // Main parsing method
    std::vector<std::unique_ptr<Statement>> parse();

    // Error handling
    bool hasErrors() const { return !errors_.empty(); }
    const std::vector<std::string>& getErrors() const { return errors_; }

private:
    // Helper methods for parsing different constructs
    std::unique_ptr<Statement> parseStatement();
    std::unique_ptr<Expression> parseExpression();
    std::unique_ptr<Type> parseType();

    // Statement parsing methods
    std::unique_ptr<ExpressionStatement> parseExpressionStatement();
    std::unique_ptr<IfStatement> parseIfStatement();
    std::unique_ptr<WhileStatement> parseWhileStatement();
    std::unique_ptr<ForStatement> parseForStatement();
    std::unique_ptr<BlockStatement> parseBlockStatement();
    std::unique_ptr<FunctionDeclaration> parseFunctionDeclaration();
    std::unique_ptr<VariableDeclaration> parseVariableDeclaration();
    std::unique_ptr<ReturnStatement> parseReturnStatement();
    std::unique_ptr<ClassDeclaration> parseClassDeclaration();
    std::unique_ptr<ImportStatement> parseImportStatement();
    std::unique_ptr<ExportStatement> parseExportStatement();
    std::unique_ptr<TypeDeclaration> parseTypeDeclaration();
    std::unique_ptr<InterfaceDeclaration> parseInterfaceDeclaration();

    // Expression parsing methods
    std::unique_ptr<AssignmentExpression> parseAssignmentExpression();
    std::unique_ptr<BinaryExpression> parseBinaryExpression();
    std::unique_ptr<UnaryExpression> parseUnaryExpression();
    std::unique_ptr<LiteralExpression> parseLiteralExpression();
    std::unique_ptr<IdentifierExpression> parseIdentifierExpression();
    std::unique_ptr<VariableExpression> parseVariableExpression();
    std::unique_ptr<CallExpression> parseCallExpression();
    std::unique_ptr<MemberExpression> parseMemberExpression();
    std::unique_ptr<FunctionExpression> parseFunctionExpression();
    std::unique_ptr<ClassExpression> parseClassExpression();
    std::unique_ptr<JSXExpression> parseJSXExpression();
    std::unique_ptr<Expression> parsePrimaryExpression();
    std::unique_ptr<Expression> finishCall(std::unique_ptr<Expression> callee);

    // Type parsing methods
    std::unique_ptr<PrimitiveType> parsePrimitiveType();
    std::unique_ptr<ObjectType> parseObjectType();
    std::unique_ptr<FunctionType> parseFunctionType();
    std::unique_ptr<GenericType> parseGenericType();
    std::unique_ptr<UnionType> parseUnionType();

    // Helper methods
    bool match(TokenKind kind);
    bool check(TokenKind kind) const;
    Token advance();
    Token peek() const;
    Token previous() const;
    bool isAtEnd() const;
    void reportError(const std::string& message);
    Token consume(TokenKind kind, const std::string& message);
    void synchronize();

    // Member variables
    std::vector<Token> tokens_;
    size_t current_ = 0;
    std::vector<std::string> errors_;
};

} // namespace superjs 