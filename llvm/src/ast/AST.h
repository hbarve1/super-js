#pragma once

#include <string>
#include <vector>
#include <memory>
#include "lexer/Lexer.h"

namespace superjs {

// Forward declarations
class Expression;
class Statement;
class Type;
class ExpressionVisitor;
class StatementVisitor;

// Expression types
class BinaryExpression;
class UnaryExpression;
class LiteralExpression;
class VariableExpression;
class AssignmentExpression;
class CallExpression;
class MemberExpression;
class FunctionExpression;
class ClassExpression;
class JSXExpression;

// Statement types
class BlockStatement;
class ExpressionStatement;
class IfStatement;
class WhileStatement;
class ForStatement;
class ReturnStatement;
class FunctionDeclaration;
class ClassDeclaration;
class ImportStatement;
class ExportStatement;
class TypeDeclaration;
class InterfaceDeclaration;
class VariableDeclaration;

// Type system
class Type {
public:
    virtual ~Type() = default;
    virtual std::string toString() const = 0;
};

// Primitive types
class PrimitiveType : public Type {
public:
    enum class Kind {
        Number,
        String,
        Boolean,
        Void,
        Any,
        Unknown
    };

    explicit PrimitiveType(Kind kind) : kind(kind) {}
    
    std::string toString() const override {
        switch (kind) {
            case Kind::Number: return "number";
            case Kind::String: return "string";
            case Kind::Boolean: return "boolean";
            case Kind::Void: return "void";
            case Kind::Any: return "any";
            case Kind::Unknown: return "unknown";
            default: return "unknown";
        }
    }

    Kind kind;
};

// Object type
class ObjectType : public Type {
public:
    ObjectType(std::vector<std::pair<std::string, std::unique_ptr<Type>>> properties)
        : properties(std::move(properties)) {}
    
    std::string toString() const override {
        std::string result = "{";
        for (size_t i = 0; i < properties.size(); ++i) {
            if (i > 0) result += ", ";
            result += properties[i].first + ": " + properties[i].second->toString();
        }
        result += "}";
        return result;
    }

    std::vector<std::pair<std::string, std::unique_ptr<Type>>> properties;
};

// Function type
class FunctionType : public Type {
public:
    FunctionType(std::vector<std::unique_ptr<Type>> params, std::unique_ptr<Type> returnType)
        : params(std::move(params)), returnType(std::move(returnType)) {}
    
    std::string toString() const override {
        std::string result = "(";
        for (size_t i = 0; i < params.size(); ++i) {
            if (i > 0) result += ", ";
            result += params[i]->toString();
        }
        result += ") => " + returnType->toString();
        return result;
    }

    std::vector<std::unique_ptr<Type>> params;
    std::unique_ptr<Type> returnType;
};

// Union type
class UnionType : public Type {
public:
    UnionType(std::vector<std::unique_ptr<Type>> types)
        : types(std::move(types)) {}
    
    std::string toString() const override {
        std::string result;
        for (size_t i = 0; i < types.size(); ++i) {
            if (i > 0) result += " | ";
            result += types[i]->toString();
        }
        return result;
    }

    std::vector<std::unique_ptr<Type>> types;
};

// Generic type
class GenericType : public Type {
public:
    GenericType(std::string name, std::vector<std::unique_ptr<Type>> typeArgs)
        : name(std::move(name)), typeArgs(std::move(typeArgs)) {}
    
    std::string toString() const override {
        std::string result = name;
        if (!typeArgs.empty()) {
            result += "<";
            for (size_t i = 0; i < typeArgs.size(); ++i) {
                if (i > 0) result += ", ";
                result += typeArgs[i]->toString();
            }
            result += ">";
        }
        return result;
    }

    std::string name;
    std::vector<std::unique_ptr<Type>> typeArgs;
};

// Base Expression class
class Expression {
public:
    virtual ~Expression() = default;
    virtual void accept(class ExpressionVisitor& visitor) = 0;
};

// Base Statement class
class Statement {
public:
    virtual ~Statement() = default;
    virtual void accept(class StatementVisitor& visitor) = 0;
};

// Binary Expression
class BinaryExpression : public Expression {
public:
    BinaryExpression(std::unique_ptr<Expression> left, Token op, std::unique_ptr<Expression> right)
        : left(std::move(left)), op(op), right(std::move(right)) {}
    
    void accept(ExpressionVisitor& visitor) override;
    
    std::unique_ptr<Expression> left;
    Token op;
    std::unique_ptr<Expression> right;
};

// Unary Expression
class UnaryExpression : public Expression {
public:
    UnaryExpression(Token op, std::unique_ptr<Expression> right)
        : op(op), right(std::move(right)) {}
    
    void accept(ExpressionVisitor& visitor) override;
    
    Token op;
    std::unique_ptr<Expression> right;
};

// Literal Expression
class LiteralExpression : public Expression {
public:
    LiteralExpression(Token value) : value(value) {}
    
    void accept(ExpressionVisitor& visitor) override;
    
    Token value;
};

// Variable Expression
class VariableExpression : public Expression {
public:
    VariableExpression(Token name) : name(name) {}
    
    void accept(ExpressionVisitor& visitor) override;
    
    Token name;
};

// Assignment Expression
class AssignmentExpression : public Expression {
public:
    AssignmentExpression(Token name, std::unique_ptr<Expression> value)
        : name(name), value(std::move(value)) {}
    
    void accept(ExpressionVisitor& visitor) override;
    
    Token name;
    std::unique_ptr<Expression> value;
};

// Call Expression
class CallExpression : public Expression {
public:
    CallExpression(std::unique_ptr<Expression> callee, std::vector<std::unique_ptr<Expression>> arguments)
        : callee(std::move(callee)), arguments(std::move(arguments)) {}
    
    void accept(ExpressionVisitor& visitor) override;
    
    std::unique_ptr<Expression> callee;
    std::vector<std::unique_ptr<Expression>> arguments;
};

// Member Expression
class MemberExpression : public Expression {
public:
    MemberExpression(std::unique_ptr<Expression> object, Token property)
        : object(std::move(object)), property(property) {}
    
    void accept(ExpressionVisitor& visitor) override;
    
    std::unique_ptr<Expression> object;
    Token property;
};

// Function Expression
class FunctionExpression : public Expression {
public:
    FunctionExpression(std::vector<Token> params, std::unique_ptr<BlockStatement> body)
        : params(std::move(params)), body(std::move(body)) {}
    
    void accept(ExpressionVisitor& visitor) override;
    
    std::vector<Token> params;
    std::unique_ptr<BlockStatement> body;
};

// Class Expression
class ClassExpression : public Expression {
public:
    ClassExpression(Token name, std::unique_ptr<VariableExpression> superclass,
              std::vector<std::unique_ptr<FunctionExpression>> methods)
        : name(name), superclass(std::move(superclass)), methods(std::move(methods)) {}
    
    void accept(ExpressionVisitor& visitor) override;
    
    Token name;
    std::unique_ptr<VariableExpression> superclass;
    std::vector<std::unique_ptr<FunctionExpression>> methods;
};

// JSX Expression
class JSXExpression : public Expression {
public:
    JSXExpression(Token tag, std::vector<std::pair<Token, std::unique_ptr<Expression>>> props,
            std::vector<std::unique_ptr<Expression>> children)
        : tag(tag), props(std::move(props)), children(std::move(children)) {}
    
    void accept(ExpressionVisitor& visitor) override;
    
    Token tag;
    std::vector<std::pair<Token, std::unique_ptr<Expression>>> props;
    std::vector<std::unique_ptr<Expression>> children;
};

// Block Statement
class BlockStatement : public Statement {
public:
    BlockStatement(std::vector<std::unique_ptr<Statement>> statements)
        : statements(std::move(statements)) {}
    
    void accept(StatementVisitor& visitor) override;
    
    std::vector<std::unique_ptr<Statement>> statements;
};

// Expression Statement
class ExpressionStatement : public Statement {
public:
    ExpressionStatement(std::unique_ptr<Expression> expression)
        : expression(std::move(expression)) {}
    
    void accept(StatementVisitor& visitor) override;
    
    std::unique_ptr<Expression> expression;
};

// If Statement
class IfStatement : public Statement {
public:
    IfStatement(std::unique_ptr<Expression> condition, std::unique_ptr<Statement> thenBranch,
               std::unique_ptr<Statement> elseBranch)
        : condition(std::move(condition)), thenBranch(std::move(thenBranch)),
          elseBranch(std::move(elseBranch)) {}
    
    void accept(StatementVisitor& visitor) override;
    
    std::unique_ptr<Expression> condition;
    std::unique_ptr<Statement> thenBranch;
    std::unique_ptr<Statement> elseBranch;
};

// While Statement
class WhileStatement : public Statement {
public:
    WhileStatement(std::unique_ptr<Expression> condition, std::unique_ptr<Statement> body)
        : condition(std::move(condition)), body(std::move(body)) {}
    
    void accept(StatementVisitor& visitor) override;
    
    std::unique_ptr<Expression> condition;
    std::unique_ptr<Statement> body;
};

// For Statement
class ForStatement : public Statement {
public:
    ForStatement(std::unique_ptr<Statement> initializer, std::unique_ptr<Expression> condition,
                std::unique_ptr<Expression> increment, std::unique_ptr<Statement> body)
        : initializer(std::move(initializer)), condition(std::move(condition)),
          increment(std::move(increment)), body(std::move(body)) {}
    
    void accept(StatementVisitor& visitor) override;
    
    std::unique_ptr<Statement> initializer;
    std::unique_ptr<Expression> condition;
    std::unique_ptr<Expression> increment;
    std::unique_ptr<Statement> body;
};

// Return Statement
class ReturnStatement : public Statement {
public:
    ReturnStatement(Token keyword, std::unique_ptr<Expression> value)
        : keyword(keyword), value(std::move(value)) {}
    
    void accept(StatementVisitor& visitor) override;
    
    Token keyword;
    std::unique_ptr<Expression> value;
};

// Function Declaration
class FunctionDeclaration : public Statement {
public:
    FunctionDeclaration(Token name, std::vector<Token> params, std::unique_ptr<BlockStatement> body)
        : name(name), params(std::move(params)), body(std::move(body)) {}
    
    void accept(StatementVisitor& visitor) override;
    
    Token name;
    std::vector<Token> params;
    std::unique_ptr<BlockStatement> body;
};

// Variable Declaration
class VariableDeclaration : public Statement {
public:
    VariableDeclaration(Token name, std::unique_ptr<Type> typeAnnotation, std::unique_ptr<Expression> initializer)
        : name(name), typeAnnotation(std::move(typeAnnotation)), initializer(std::move(initializer)) {}
    
    void accept(StatementVisitor& visitor) override;
    
    Token name;
    std::unique_ptr<Type> typeAnnotation;
    std::unique_ptr<Expression> initializer;
};

// Class Declaration
class ClassDeclaration : public Statement {
public:
    ClassDeclaration(Token name, std::unique_ptr<VariableExpression> superclass,
              std::vector<std::unique_ptr<FunctionExpression>> methods)
        : name(name), superclass(std::move(superclass)), methods(std::move(methods)) {}
    
    void accept(StatementVisitor& visitor) override;
    
    Token name;
    std::unique_ptr<VariableExpression> superclass;
    std::vector<std::unique_ptr<FunctionExpression>> methods;
};

// Import Statement
class ImportStatement : public Statement {
public:
    ImportStatement(Token module, std::vector<Token> names)
        : module(module), names(std::move(names)) {}
    
    void accept(StatementVisitor& visitor) override;
    
    Token module;
    std::vector<Token> names;
};

// Export Statement
class ExportStatement : public Statement {
public:
    ExportStatement(std::unique_ptr<Statement> declaration)
        : declaration(std::move(declaration)) {}
    
    void accept(StatementVisitor& visitor) override;
    
    std::unique_ptr<Statement> declaration;
};

// Type Declaration
class TypeDeclaration : public Statement {
public:
    TypeDeclaration(Token name, std::unique_ptr<Type> type)
        : name(name), type(std::move(type)) {}
    
    void accept(StatementVisitor& visitor) override;
    
    Token name;
    std::unique_ptr<Type> type;
};

// Interface Declaration
class InterfaceDeclaration : public Statement {
public:
    InterfaceDeclaration(Token name, std::vector<std::pair<Token, std::unique_ptr<Type>>> properties)
        : name(name), properties(std::move(properties)) {}
    
    void accept(StatementVisitor& visitor) override;
    
    Token name;
    std::vector<std::pair<Token, std::unique_ptr<Type>>> properties;
};

// Visitor interfaces
class ExpressionVisitor {
public:
    virtual ~ExpressionVisitor() = default;
    virtual void visitBinaryExpression(BinaryExpression& expr) = 0;
    virtual void visitUnaryExpression(UnaryExpression& expr) = 0;
    virtual void visitLiteralExpression(LiteralExpression& expr) = 0;
    virtual void visitVariableExpression(VariableExpression& expr) = 0;
    virtual void visitAssignmentExpression(AssignmentExpression& expr) = 0;
    virtual void visitCallExpression(CallExpression& expr) = 0;
    virtual void visitMemberExpression(MemberExpression& expr) = 0;
    virtual void visitFunctionExpression(FunctionExpression& expr) = 0;
    virtual void visitClassExpression(ClassExpression& expr) = 0;
    virtual void visitJSXExpression(JSXExpression& expr) = 0;
};

class StatementVisitor {
public:
    virtual ~StatementVisitor() = default;
    virtual void visitBlockStatement(BlockStatement& stmt) = 0;
    virtual void visitExpressionStatement(ExpressionStatement& stmt) = 0;
    virtual void visitIfStatement(IfStatement& stmt) = 0;
    virtual void visitWhileStatement(WhileStatement& stmt) = 0;
    virtual void visitForStatement(ForStatement& stmt) = 0;
    virtual void visitReturnStatement(ReturnStatement& stmt) = 0;
    virtual void visitFunctionDeclaration(FunctionDeclaration& stmt) = 0;
    virtual void visitClassDeclaration(ClassDeclaration& stmt) = 0;
    virtual void visitImportStatement(ImportStatement& stmt) = 0;
    virtual void visitExportStatement(ExportStatement& stmt) = 0;
    virtual void visitTypeDeclaration(TypeDeclaration& stmt) = 0;
    virtual void visitInterfaceDeclaration(InterfaceDeclaration& stmt) = 0;
    virtual void visitVariableDeclaration(VariableDeclaration& stmt) = 0;
};

} // namespace superjs 