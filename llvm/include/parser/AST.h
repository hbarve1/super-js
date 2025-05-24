#pragma once

#include <string>
#include <vector>
#include <memory>
#include "lexer/Lexer.h"

namespace superjs {

// Forward declarations
class Expression;
class Statement;
class BinaryExpression;
class UnaryExpression;
class LiteralExpression;
class IdentifierExpression;
class IfStatement;
class WhileStatement;
class ForStatement;
class BlockStatement;
class FunctionDeclaration;
class VariableDeclaration;
class ExpressionStatement;
class AssignmentExpression;

// Base class for all AST nodes
class Node {
public:
    virtual ~Node() = default;
    virtual void accept(class ASTVisitor& visitor) = 0;
};

// Base class for all expressions
class Expression : public Node {
public:
    virtual ~Expression() = default;
};

// Base class for all statements
class Statement : public Node {
public:
    virtual ~Statement() = default;
};

// Expression statements (e.g., x + y;)
class ExpressionStatement : public Statement {
public:
    explicit ExpressionStatement(std::unique_ptr<Expression> expression)
        : expression(std::move(expression)) {}

    void accept(ASTVisitor& visitor) override;

    std::unique_ptr<Expression> expression;
};

// Assignment expressions (e.g., x = 42)
class AssignmentExpression : public Expression {
public:
    AssignmentExpression(Token name, std::unique_ptr<Expression> value)
        : name(name), value(std::move(value)) {}

    void accept(ASTVisitor& visitor) override;

    Token name;
    std::unique_ptr<Expression> value;
};

// Binary expressions (e.g., a + b, a * b)
class BinaryExpression : public Expression {
public:
    BinaryExpression(std::unique_ptr<Expression> left, Token op, std::unique_ptr<Expression> right)
        : left(std::move(left)), op(op), right(std::move(right)) {}

    void accept(ASTVisitor& visitor) override;

    std::unique_ptr<Expression> left;
    Token op;
    std::unique_ptr<Expression> right;
};

// Unary expressions (e.g., -a, !b)
class UnaryExpression : public Expression {
public:
    UnaryExpression(Token op, std::unique_ptr<Expression> right)
        : op(op), right(std::move(right)) {}

    void accept(ASTVisitor& visitor) override;

    Token op;
    std::unique_ptr<Expression> right;
};

// Literal expressions (e.g., 42, "hello", true)
class LiteralExpression : public Expression {
public:
    LiteralExpression(Token value) : value(value) {}

    void accept(ASTVisitor& visitor) override;

    Token value;
};

// Identifier expressions (e.g., variable names)
class IdentifierExpression : public Expression {
public:
    IdentifierExpression(Token name) : name(name) {}

    void accept(ASTVisitor& visitor) override;

    Token name;
};

// If statements
class IfStatement : public Statement {
public:
    IfStatement(std::unique_ptr<Expression> condition,
                std::unique_ptr<Statement> thenBranch,
                std::unique_ptr<Statement> elseBranch)
        : condition(std::move(condition)),
          thenBranch(std::move(thenBranch)),
          elseBranch(std::move(elseBranch)) {}

    void accept(ASTVisitor& visitor) override;

    std::unique_ptr<Expression> condition;
    std::unique_ptr<Statement> thenBranch;
    std::unique_ptr<Statement> elseBranch;
};

// While statements
class WhileStatement : public Statement {
public:
    WhileStatement(std::unique_ptr<Expression> condition,
                  std::unique_ptr<Statement> body)
        : condition(std::move(condition)),
          body(std::move(body)) {}

    void accept(ASTVisitor& visitor) override;

    std::unique_ptr<Expression> condition;
    std::unique_ptr<Statement> body;
};

// Block statements (e.g., { statement1; statement2; })
class BlockStatement : public Statement {
public:
    BlockStatement(std::vector<std::unique_ptr<Statement>> statements)
        : statements(std::move(statements)) {}

    void accept(ASTVisitor& visitor) override;

    std::vector<std::unique_ptr<Statement>> statements;
};

// Function declarations
class FunctionDeclaration : public Statement {
public:
    FunctionDeclaration(Token name,
                       std::vector<Token> parameters,
                       std::unique_ptr<BlockStatement> body)
        : name(name),
          parameters(std::move(parameters)),
          body(std::move(body)) {}

    void accept(ASTVisitor& visitor) override;

    Token name;
    std::vector<Token> parameters;
    std::unique_ptr<BlockStatement> body;
};

// Variable declarations
class VariableDeclaration : public Statement {
public:
    VariableDeclaration(Token name,
                       std::unique_ptr<Expression> initializer)
        : name(name),
          initializer(std::move(initializer)) {}

    void accept(ASTVisitor& visitor) override;

    Token name;
    std::unique_ptr<Expression> initializer;
};

// Visitor interface for AST traversal
class ASTVisitor {
public:
    virtual ~ASTVisitor() = default;
    virtual void visitExpressionStatement(ExpressionStatement& stmt) = 0;
    virtual void visitAssignmentExpression(AssignmentExpression& expr) = 0;
    virtual void visitBinaryExpression(BinaryExpression& expr) = 0;
    virtual void visitUnaryExpression(UnaryExpression& expr) = 0;
    virtual void visitLiteralExpression(LiteralExpression& expr) = 0;
    virtual void visitIdentifierExpression(IdentifierExpression& expr) = 0;
    virtual void visitIfStatement(IfStatement& stmt) = 0;
    virtual void visitWhileStatement(WhileStatement& stmt) = 0;
    virtual void visitBlockStatement(BlockStatement& stmt) = 0;
    virtual void visitFunctionDeclaration(FunctionDeclaration& stmt) = 0;
    virtual void visitVariableDeclaration(VariableDeclaration& stmt) = 0;
};

} // namespace superjs 