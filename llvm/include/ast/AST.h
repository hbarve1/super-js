#pragma once

#include <memory>
#include <string>
#include <vector>
#include "../lexer/Lexer.h"

namespace superjs {

// Forward declarations
class Expression;
class Statement;

// Expression base class
class Expression {
public:
    virtual ~Expression() = default;
};

// Statement base class
class Statement {
public:
    virtual ~Statement() = default;
};

// Block statement
class BlockStatement : public Statement {
public:
    std::vector<std::unique_ptr<Statement>> statements;
};

// Variable declaration
class VariableDeclaration : public Statement {
public:
    Token name;
    std::unique_ptr<Expression> initializer;
};

// Function declaration
class FunctionDeclaration : public Statement {
public:
    Token name;
    std::vector<Token> parameters;
    std::unique_ptr<BlockStatement> body;
};

// If statement
class IfStatement : public Statement {
public:
    std::unique_ptr<Expression> condition;
    std::unique_ptr<BlockStatement> thenBranch;
    std::unique_ptr<BlockStatement> elseBranch;
};

// While statement
class WhileStatement : public Statement {
public:
    std::unique_ptr<Expression> condition;
    std::unique_ptr<BlockStatement> body;
};

// For statement
class ForStatement : public Statement {
public:
    std::unique_ptr<Statement> initializer;
    std::unique_ptr<Expression> condition;
    std::unique_ptr<Expression> increment;
    std::unique_ptr<BlockStatement> body;
};

// Expression statement
class ExpressionStatement : public Statement {
public:
    std::unique_ptr<Expression> expression;
};

// Binary expression
class BinaryExpression : public Expression {
public:
    std::unique_ptr<Expression> left;
    Token op;
    std::unique_ptr<Expression> right;
};

// Unary expression
class UnaryExpression : public Expression {
public:
    Token op;
    std::unique_ptr<Expression> right;
};

// Literal expression
class LiteralExpression : public Expression {
public:
    Token value;
};

// Variable expression
class VariableExpression : public Expression {
public:
    Token name;
};

// Assignment expression
class AssignmentExpression : public Expression {
public:
    Token name;
    std::unique_ptr<Expression> value;
};

// Call expression
class CallExpression : public Expression {
public:
    std::unique_ptr<Expression> callee;
    std::vector<std::unique_ptr<Expression>> arguments;
};

} // namespace superjs 