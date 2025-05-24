#pragma once

#include <string>
#include <vector>
#include <memory>
#include "../lexer/Lexer.h"

namespace superjs {

// Forward declarations
class ASTVisitor;
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
class ReturnStatement;
class ClassDeclaration;
class ImportStatement;
class ExportStatement;
class TypeDeclaration;
class InterfaceDeclaration;

// Forward declarations for expressions
class VariableExpression;
class CallExpression;
class MemberExpression;
class FunctionExpression;
class ClassExpression;
class JSXExpression;

// Forward declarations for types
class Type;
class PrimitiveType;
class ObjectType;
class FunctionType;
class GenericType;
class UnionType;

// Base class for all AST nodes
class Node {
public:
    virtual ~Node() = default;
    virtual void accept(ASTVisitor& visitor) = 0;
};

// Base class for all types
class Type : public Node {
public:
    virtual ~Type() = default;
};

// Primitive types (number, string, boolean, etc.)
class PrimitiveType : public Type {
public:
    enum class Kind { Number, String, Boolean, Void, Any, Unknown };
    explicit PrimitiveType(Kind kind) : kind(kind) {}
    virtual ~PrimitiveType() = default;
    void accept(ASTVisitor& visitor) override;
    Kind kind;
};

// Object types (interfaces, classes)
class ObjectType : public Type {
public:
    explicit ObjectType(std::vector<std::pair<Token, std::unique_ptr<Type>>> properties)
        : properties(std::move(properties)) {}
    virtual ~ObjectType() = default;
    void accept(ASTVisitor& visitor) override;
    std::vector<std::pair<Token, std::unique_ptr<Type>>> properties;
};

// Function types
class FunctionType : public Type {
public:
    FunctionType(std::vector<std::unique_ptr<Type>> parameters,
                std::unique_ptr<Type> returnType)
        : parameters(std::move(parameters)),
          returnType(std::move(returnType)) {}
    virtual ~FunctionType() = default;
    void accept(ASTVisitor& visitor) override;
    std::vector<std::unique_ptr<Type>> parameters;
    std::unique_ptr<Type> returnType;
};

// Generic types
class GenericType : public Type {
public:
    GenericType(const std::string& name,
               std::vector<std::unique_ptr<Type>> typeArguments)
        : name(name),
          typeArguments(std::move(typeArguments)) {}
    virtual ~GenericType() = default;
    void accept(ASTVisitor& visitor) override;
    std::string name;
    std::vector<std::unique_ptr<Type>> typeArguments;
};

// Union types
class UnionType : public Type {
public:
    explicit UnionType(std::vector<std::unique_ptr<Type>> types)
        : types(std::move(types)) {}
    virtual ~UnionType() = default;
    void accept(ASTVisitor& visitor) override;
    std::vector<std::unique_ptr<Type>> types;
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
    virtual ~ExpressionStatement() = default;
    void accept(ASTVisitor& visitor) override;
    std::unique_ptr<Expression> expression;
};

// Assignment expressions (e.g., x = 42)
class AssignmentExpression : public Expression {
public:
    AssignmentExpression(Token name, std::unique_ptr<Expression> value)
        : name(name), value(std::move(value)) {}
    virtual ~AssignmentExpression() = default;
    void accept(ASTVisitor& visitor) override;
    Token name;
    std::unique_ptr<Expression> value;
};

// Binary expressions (e.g., a + b, a * b)
class BinaryExpression : public Expression {
public:
    BinaryExpression(std::unique_ptr<Expression> left, Token op, std::unique_ptr<Expression> right)
        : left(std::move(left)), op(op), right(std::move(right)) {}
    virtual ~BinaryExpression() = default;
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
    virtual ~UnaryExpression() = default;
    void accept(ASTVisitor& visitor) override;
    Token op;
    std::unique_ptr<Expression> right;
};

// Literal expressions (e.g., 42, "hello", true)
class LiteralExpression : public Expression {
public:
    LiteralExpression(Token value) : value(value) {}
    virtual ~LiteralExpression() = default;
    void accept(ASTVisitor& visitor) override;
    Token value;
};

// Identifier expressions (e.g., variable names)
class IdentifierExpression : public Expression {
public:
    IdentifierExpression(Token name) : name(name) {}
    virtual ~IdentifierExpression() = default;
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

// For statements
class ForStatement : public Statement {
public:
    ForStatement(std::unique_ptr<Statement> initializer,
                 std::unique_ptr<Expression> condition,
                 std::unique_ptr<Expression> increment,
                 std::unique_ptr<Statement> body)
        : initializer(std::move(initializer)),
          condition(std::move(condition)),
          increment(std::move(increment)),
          body(std::move(body)) {}

    void accept(ASTVisitor& visitor) override;

    std::unique_ptr<Statement> initializer;
    std::unique_ptr<Expression> condition;
    std::unique_ptr<Expression> increment;
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
                       std::unique_ptr<Statement> body)
        : name(name),
          parameters(std::move(parameters)),
          body(std::move(body)) {}

    void accept(ASTVisitor& visitor) override;

    Token name;
    std::vector<Token> parameters;
    std::unique_ptr<Statement> body;
};

// Variable declarations
class VariableDeclaration : public Statement {
public:
    VariableDeclaration(Token name,
                       std::unique_ptr<Type> typeAnnotation,
                       std::unique_ptr<Expression> initializer)
        : name(name),
          typeAnnotation(std::move(typeAnnotation)),
          initializer(std::move(initializer)) {}

    void accept(ASTVisitor& visitor) override;

    Token name;
    std::unique_ptr<Type> typeAnnotation;
    std::unique_ptr<Expression> initializer;
};

// Return statements
class ReturnStatement : public Statement {
public:
    ReturnStatement(Token keyword,
                   std::unique_ptr<Expression> value)
        : keyword(keyword),
          value(std::move(value)) {}

    void accept(ASTVisitor& visitor) override;

    Token keyword;
    std::unique_ptr<Expression> value;
};

// Class declarations
class ClassDeclaration : public Statement {
public:
    ClassDeclaration(Token name,
                    std::unique_ptr<Expression> superclass,
                    std::vector<std::unique_ptr<FunctionExpression>> methods)
        : name(name),
          superclass(std::move(superclass)),
          methods(std::move(methods)) {}

    void accept(ASTVisitor& visitor) override;

    Token name;
    std::unique_ptr<Expression> superclass;
    std::vector<std::unique_ptr<FunctionExpression>> methods;
};

// Import statements
class ImportStatement : public Statement {
public:
    ImportStatement(Token module,
                   std::vector<Token> names)
        : module(module),
          names(std::move(names)) {}

    void accept(ASTVisitor& visitor) override;

    Token module;
    std::vector<Token> names;
};

// Export statements
class ExportStatement : public Statement {
public:
    ExportStatement(std::unique_ptr<Statement> declaration)
        : declaration(std::move(declaration)) {}

    void accept(ASTVisitor& visitor) override;

    std::unique_ptr<Statement> declaration;
};

// Type declarations
class TypeDeclaration : public Statement {
public:
    TypeDeclaration(Token name,
                   std::unique_ptr<Type> type)
        : name(name),
          type(std::move(type)) {}

    void accept(ASTVisitor& visitor) override;

    Token name;
    std::unique_ptr<Type> type;
};

// Interface declarations
class InterfaceDeclaration : public Statement {
public:
    InterfaceDeclaration(Token name,
                        std::vector<std::pair<Token, std::unique_ptr<Type>>> properties)
        : name(name),
          properties(std::move(properties)) {}

    void accept(ASTVisitor& visitor) override;

    Token name;
    std::vector<std::pair<Token, std::unique_ptr<Type>>> properties;
};

// VariableExpression (for variable references)
class VariableExpression : public Expression {
public:
    explicit VariableExpression(Token name) : name(name) {}
    virtual ~VariableExpression() = default;
    void accept(ASTVisitor& visitor) override;
    Token name;
};

// FunctionExpression (for anonymous functions)
class FunctionExpression : public Expression {
public:
    FunctionExpression(std::vector<Token> parameters,
                      std::unique_ptr<Statement> body)
        : parameters(std::move(parameters)),
          body(std::move(body)) {}
    virtual ~FunctionExpression() = default;
    void accept(ASTVisitor& visitor) override;
    std::vector<Token> parameters;
    std::unique_ptr<Statement> body;
};

// ClassExpression (for anonymous classes)
class ClassExpression : public Expression {
public:
    ClassExpression(Token name, std::unique_ptr<VariableExpression> superclass, std::vector<std::unique_ptr<FunctionExpression>> methods)
        : name(name), superclass(std::move(superclass)), methods(std::move(methods)) {}
    virtual ~ClassExpression() = default;
    void accept(ASTVisitor& visitor) override;
    Token name;
    std::unique_ptr<VariableExpression> superclass;
    std::vector<std::unique_ptr<FunctionExpression>> methods;
};

// JSXExpression (for JSX syntax)
class JSXExpression : public Expression {
public:
    JSXExpression(Token tag, std::vector<std::pair<Token, std::unique_ptr<Expression>>> props, std::vector<std::unique_ptr<Expression>> children)
        : tag(tag), props(std::move(props)), children(std::move(children)) {}
    virtual ~JSXExpression() = default;
    void accept(ASTVisitor& visitor) override;
    Token tag;
    std::vector<std::pair<Token, std::unique_ptr<Expression>>> props;
    std::vector<std::unique_ptr<Expression>> children;
};

// CallExpression (for function calls)
class CallExpression : public Expression {
public:
    CallExpression(std::unique_ptr<Expression> callee, std::vector<std::unique_ptr<Expression>> arguments)
        : callee(std::move(callee)), arguments(std::move(arguments)) {}
    virtual ~CallExpression() = default;
    void accept(ASTVisitor& visitor) override;
    std::unique_ptr<Expression> callee;
    std::vector<std::unique_ptr<Expression>> arguments;
};

// MemberExpression (for object property access)
class MemberExpression : public Expression {
public:
    MemberExpression(std::unique_ptr<Expression> object, Token property)
        : object(std::move(object)), property(property) {}
    virtual ~MemberExpression() = default;
    void accept(ASTVisitor& visitor) override;
    std::unique_ptr<Expression> object;
    Token property;
};

} // namespace superjs 