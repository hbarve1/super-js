#pragma once

#include <string>
#include <vector>
#include <memory>
#include <stdexcept>
#include "lexer/Lexer.h"
#include "AST.h"

namespace superjs {

class ParseError : public std::runtime_error {
public:
    explicit ParseError(const std::string& message) : std::runtime_error(message) {}
};

class Parser {
public:
    explicit Parser(const std::vector<Token>& tokens);
    
    // Parse the entire program
    std::vector<std::unique_ptr<Stmt>> parse();
    
private:
    std::vector<Token> tokens;
    size_t current;
    
    // Helper methods
    bool isAtEnd() const;
    Token advance();
    bool check(TokenKind kind) const;
    bool match(TokenKind kind);
    Token consume(TokenKind kind, const std::string& message);
    Token peek() const;
    Token previous() const;
    ParseError error(const Token& token, const std::string& message);
    void synchronize();
    
    // Statement parsing methods
    std::unique_ptr<Stmt> statement();
    std::unique_ptr<Stmt> ifStatement();
    std::unique_ptr<Stmt> whileStatement();
    std::unique_ptr<Stmt> forStatement();
    std::unique_ptr<Stmt> returnStatement();
    std::unique_ptr<Stmt> functionStatement();
    std::unique_ptr<Stmt> classStatement();
    std::unique_ptr<Stmt> importStatement();
    std::unique_ptr<Stmt> exportStatement();
    std::unique_ptr<Stmt> typeStatement();
    std::unique_ptr<Stmt> interfaceStatement();
    std::unique_ptr<Stmt> blockStatement();
    std::unique_ptr<Stmt> expressionStatement();
    std::unique_ptr<Stmt> variableDeclaration();
    
    // Expression parsing methods
    std::unique_ptr<Expr> expression();
    std::unique_ptr<Expr> assignment();
    std::unique_ptr<Expr> logicalOr();
    std::unique_ptr<Expr> logicalAnd();
    std::unique_ptr<Expr> equality();
    std::unique_ptr<Expr> comparison();
    std::unique_ptr<Expr> term();
    std::unique_ptr<Expr> factor();
    std::unique_ptr<Expr> unary();
    std::unique_ptr<Expr> call();
    std::unique_ptr<Expr> finishCall(std::unique_ptr<Expr> callee);
    std::unique_ptr<Expr> primary();
    std::unique_ptr<Expr> jsx();
    
    // Type parsing
    std::unique_ptr<Type> type();
    std::unique_ptr<Type> unionType();
    std::unique_ptr<Type> intersectionType();
    std::unique_ptr<Type> objectType();
    std::unique_ptr<Type> arrayType();
    std::unique_ptr<Type> functionType();
    std::unique_ptr<Type> primaryType();
};

} // namespace superjs 