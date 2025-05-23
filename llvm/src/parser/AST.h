#pragma once

#include <string>
#include <vector>
#include <memory>
#include "lexer/Lexer.h"

namespace superjs {

// Forward declarations
class Expr;
class Stmt;
class Type;

// Expression types
class BinaryExpr;
class UnaryExpr;
class LiteralExpr;
class VariableExpr;
class AssignmentExpr;
class CallExpr;
class MemberExpr;
class FunctionExpr;
class ClassExpr;
class JSXExpr;

// Statement types
class BlockStmt;
class ExpressionStmt;
class IfStmt;
class WhileStmt;
class ForStmt;
class ReturnStmt;
class FunctionStmt;
class ClassStmt;
class ImportStmt;
class ExportStmt;
class TypeStmt;
class InterfaceStmt;

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
class Expr {
public:
    virtual ~Expr() = default;
    virtual void accept(class ExprVisitor& visitor) = 0;
};

// Base Statement class
class Stmt {
public:
    virtual ~Stmt() = default;
    virtual void accept(class StmtVisitor& visitor) = 0;
};

// Binary Expression
class BinaryExpr : public Expr {
public:
    BinaryExpr(std::unique_ptr<Expr> left, Token op, std::unique_ptr<Expr> right)
        : left(std::move(left)), op(op), right(std::move(right)) {}
    
    void accept(ExprVisitor& visitor) override;
    
    std::unique_ptr<Expr> left;
    Token op;
    std::unique_ptr<Expr> right;
};

// Unary Expression
class UnaryExpr : public Expr {
public:
    UnaryExpr(Token op, std::unique_ptr<Expr> right)
        : op(op), right(std::move(right)) {}
    
    void accept(ExprVisitor& visitor) override;
    
    Token op;
    std::unique_ptr<Expr> right;
};

// Literal Expression
class LiteralExpr : public Expr {
public:
    LiteralExpr(Token value) : value(value) {}
    
    void accept(ExprVisitor& visitor) override;
    
    Token value;
};

// Variable Expression
class VariableExpr : public Expr {
public:
    VariableExpr(Token name) : name(name) {}
    
    void accept(ExprVisitor& visitor) override;
    
    Token name;
};

// Assignment Expression
class AssignmentExpr : public Expr {
public:
    AssignmentExpr(Token name, std::unique_ptr<Expr> value)
        : name(name), value(std::move(value)) {}
    
    void accept(ExprVisitor& visitor) override;
    
    Token name;
    std::unique_ptr<Expr> value;
};

// Call Expression
class CallExpr : public Expr {
public:
    CallExpr(std::unique_ptr<Expr> callee, std::vector<std::unique_ptr<Expr>> arguments)
        : callee(std::move(callee)), arguments(std::move(arguments)) {}
    
    void accept(ExprVisitor& visitor) override;
    
    std::unique_ptr<Expr> callee;
    std::vector<std::unique_ptr<Expr>> arguments;
};

// Member Expression
class MemberExpr : public Expr {
public:
    MemberExpr(std::unique_ptr<Expr> object, Token property)
        : object(std::move(object)), property(property) {}
    
    void accept(ExprVisitor& visitor) override;
    
    std::unique_ptr<Expr> object;
    Token property;
};

// Function Expression
class FunctionExpr : public Expr {
public:
    FunctionExpr(std::vector<Token> params, std::unique_ptr<BlockStmt> body)
        : params(std::move(params)), body(std::move(body)) {}
    
    void accept(ExprVisitor& visitor) override;
    
    std::vector<Token> params;
    std::unique_ptr<BlockStmt> body;
};

// Class Expression
class ClassExpr : public Expr {
public:
    ClassExpr(Token name, std::unique_ptr<VariableExpr> superclass,
              std::vector<std::unique_ptr<FunctionStmt>> methods)
        : name(name), superclass(std::move(superclass)), methods(std::move(methods)) {}
    
    void accept(ExprVisitor& visitor) override;
    
    Token name;
    std::unique_ptr<VariableExpr> superclass;
    std::vector<std::unique_ptr<FunctionStmt>> methods;
};

// JSX Expression
class JSXExpr : public Expr {
public:
    JSXExpr(Token tag, std::vector<std::pair<Token, std::unique_ptr<Expr>>> props,
            std::vector<std::unique_ptr<Expr>> children)
        : tag(tag), props(std::move(props)), children(std::move(children)) {}
    
    void accept(ExprVisitor& visitor) override;
    
    Token tag;
    std::vector<std::pair<Token, std::unique_ptr<Expr>>> props;
    std::vector<std::unique_ptr<Expr>> children;
};

// Block Statement
class BlockStmt : public Stmt {
public:
    BlockStmt(std::vector<std::unique_ptr<Stmt>> statements)
        : statements(std::move(statements)) {}
    
    void accept(StmtVisitor& visitor) override;
    
    std::vector<std::unique_ptr<Stmt>> statements;
};

// Expression Statement
class ExpressionStmt : public Stmt {
public:
    ExpressionStmt(std::unique_ptr<Expr> expression)
        : expression(std::move(expression)) {}
    
    void accept(StmtVisitor& visitor) override;
    
    std::unique_ptr<Expr> expression;
};

// If Statement
class IfStmt : public Stmt {
public:
    IfStmt(std::unique_ptr<Expr> condition, std::unique_ptr<Stmt> thenBranch,
           std::unique_ptr<Stmt> elseBranch)
        : condition(std::move(condition)), thenBranch(std::move(thenBranch)),
          elseBranch(std::move(elseBranch)) {}
    
    void accept(StmtVisitor& visitor) override;
    
    std::unique_ptr<Expr> condition;
    std::unique_ptr<Stmt> thenBranch;
    std::unique_ptr<Stmt> elseBranch;
};

// While Statement
class WhileStmt : public Stmt {
public:
    WhileStmt(std::unique_ptr<Expr> condition, std::unique_ptr<Stmt> body)
        : condition(std::move(condition)), body(std::move(body)) {}
    
    void accept(StmtVisitor& visitor) override;
    
    std::unique_ptr<Expr> condition;
    std::unique_ptr<Stmt> body;
};

// For Statement
class ForStmt : public Stmt {
public:
    ForStmt(std::unique_ptr<Stmt> initializer, std::unique_ptr<Expr> condition,
            std::unique_ptr<Expr> increment, std::unique_ptr<Stmt> body)
        : initializer(std::move(initializer)), condition(std::move(condition)),
          increment(std::move(increment)), body(std::move(body)) {}
    
    void accept(StmtVisitor& visitor) override;
    
    std::unique_ptr<Stmt> initializer;
    std::unique_ptr<Expr> condition;
    std::unique_ptr<Expr> increment;
    std::unique_ptr<Stmt> body;
};

// Return Statement
class ReturnStmt : public Stmt {
public:
    ReturnStmt(Token keyword, std::unique_ptr<Expr> value)
        : keyword(keyword), value(std::move(value)) {}
    
    void accept(StmtVisitor& visitor) override;
    
    Token keyword;
    std::unique_ptr<Expr> value;
};

// Function Statement
class FunctionStmt : public Stmt {
public:
    FunctionStmt(Token name, std::vector<Token> params, std::unique_ptr<BlockStmt> body)
        : name(name), params(std::move(params)), body(std::move(body)) {}
    
    void accept(StmtVisitor& visitor) override;
    
    Token name;
    std::vector<Token> params;
    std::unique_ptr<BlockStmt> body;
};

// Class Statement
class ClassStmt : public Stmt {
public:
    ClassStmt(Token name, std::unique_ptr<VariableExpr> superclass,
              std::vector<std::unique_ptr<FunctionStmt>> methods)
        : name(name), superclass(std::move(superclass)), methods(std::move(methods)) {}
    
    void accept(StmtVisitor& visitor) override;
    
    Token name;
    std::unique_ptr<VariableExpr> superclass;
    std::vector<std::unique_ptr<FunctionStmt>> methods;
};

// Import Statement
class ImportStmt : public Stmt {
public:
    ImportStmt(Token module, std::vector<Token> names)
        : module(module), names(std::move(names)) {}
    
    void accept(StmtVisitor& visitor) override;
    
    Token module;
    std::vector<Token> names;
};

// Export Statement
class ExportStmt : public Stmt {
public:
    ExportStmt(std::unique_ptr<Stmt> declaration)
        : declaration(std::move(declaration)) {}
    
    void accept(StmtVisitor& visitor) override;
    
    std::unique_ptr<Stmt> declaration;
};

// Type Statement
class TypeStmt : public Stmt {
public:
    TypeStmt(Token name, std::unique_ptr<Type> type)
        : name(name), type(std::move(type)) {}
    
    void accept(StmtVisitor& visitor) override;
    
    Token name;
    std::unique_ptr<Type> type;
};

// Interface Statement
class InterfaceStmt : public Stmt {
public:
    InterfaceStmt(Token name, std::vector<std::pair<Token, std::unique_ptr<Type>>> properties)
        : name(name), properties(std::move(properties)) {}
    
    void accept(StmtVisitor& visitor) override;
    
    Token name;
    std::vector<std::pair<Token, std::unique_ptr<Type>>> properties;
};

// Visitor interfaces
class ExprVisitor {
public:
    virtual ~ExprVisitor() = default;
    virtual void visitBinaryExpr(BinaryExpr& expr) = 0;
    virtual void visitUnaryExpr(UnaryExpr& expr) = 0;
    virtual void visitLiteralExpr(LiteralExpr& expr) = 0;
    virtual void visitVariableExpr(VariableExpr& expr) = 0;
    virtual void visitAssignmentExpr(AssignmentExpr& expr) = 0;
    virtual void visitCallExpr(CallExpr& expr) = 0;
    virtual void visitMemberExpr(MemberExpr& expr) = 0;
    virtual void visitFunctionExpr(FunctionExpr& expr) = 0;
    virtual void visitClassExpr(ClassExpr& expr) = 0;
    virtual void visitJSXExpr(JSXExpr& expr) = 0;
};

class StmtVisitor {
public:
    virtual ~StmtVisitor() = default;
    virtual void visitBlockStmt(BlockStmt& stmt) = 0;
    virtual void visitExpressionStmt(ExpressionStmt& stmt) = 0;
    virtual void visitIfStmt(IfStmt& stmt) = 0;
    virtual void visitWhileStmt(WhileStmt& stmt) = 0;
    virtual void visitForStmt(ForStmt& stmt) = 0;
    virtual void visitReturnStmt(ReturnStmt& stmt) = 0;
    virtual void visitFunctionStmt(FunctionStmt& stmt) = 0;
    virtual void visitClassStmt(ClassStmt& stmt) = 0;
    virtual void visitImportStmt(ImportStmt& stmt) = 0;
    virtual void visitExportStmt(ExportStmt& stmt) = 0;
    virtual void visitTypeStmt(TypeStmt& stmt) = 0;
    virtual void visitInterfaceStmt(InterfaceStmt& stmt) = 0;
};

} // namespace superjs 