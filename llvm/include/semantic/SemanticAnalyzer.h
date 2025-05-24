#pragma once

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>
#include "parser/AST.h"

namespace superjs {

// Forward declarations
class Type;
class SymbolTable;

// Type hierarchy
class Type {
public:
    virtual ~Type() = default;
    virtual std::string toString() const = 0;
    virtual bool isAssignableFrom(const Type& other) const = 0;
};

class PrimitiveType : public Type {
public:
    enum class Kind {
        Number,
        Boolean,
        String,
        Void
    };

    explicit PrimitiveType(Kind kind) : kind_(kind) {}
    std::string toString() const override;
    bool isAssignableFrom(const Type& other) const override;

private:
    Kind kind_;
};

// Symbol table entry
struct Symbol {
    std::string name;
    std::shared_ptr<Type> type;
    bool isMutable;
    bool isInitialized;
};

// Symbol table for scoping
class SymbolTable {
public:
    SymbolTable() = default;
    explicit SymbolTable(std::shared_ptr<SymbolTable> parent) : parent_(parent) {}

    void define(const std::string& name, std::shared_ptr<Type> type, bool isMutable = true);
    Symbol* resolve(const std::string& name);
    void markInitialized(const std::string& name);
    std::shared_ptr<SymbolTable> getParent() const { return parent_; }

private:
    std::unordered_map<std::string, Symbol> symbols_;
    std::shared_ptr<SymbolTable> parent_;
};

// Semantic analyzer
class SemanticAnalyzer : public ASTVisitor {
public:
    SemanticAnalyzer();
    
    // Main analysis entry point
    void analyze(const std::vector<std::unique_ptr<Statement>>& statements);

    // Error handling
    bool hasErrors() const { return !errors_.empty(); }
    const std::vector<std::string>& getErrors() const { return errors_; }

    // ASTVisitor implementation
    void visitExpressionStatement(ExpressionStatement& stmt) override;
    void visitAssignmentExpression(AssignmentExpression& expr) override;
    void visitBinaryExpression(BinaryExpression& expr) override;
    void visitUnaryExpression(UnaryExpression& expr) override;
    void visitLiteralExpression(LiteralExpression& expr) override;
    void visitIdentifierExpression(IdentifierExpression& expr) override;
    void visitIfStatement(IfStatement& stmt) override;
    void visitWhileStatement(WhileStatement& stmt) override;
    void visitBlockStatement(BlockStatement& stmt) override;
    void visitFunctionDeclaration(FunctionDeclaration& stmt) override;
    void visitVariableDeclaration(VariableDeclaration& stmt) override;

private:
    // Helper methods
    void enterScope();
    void exitScope();
    void reportError(const std::string& message);
    std::shared_ptr<Type> visitExpression(Expression& expr);

    std::shared_ptr<SymbolTable> currentScope_;
    std::vector<std::string> errors_;
};

} // namespace superjs 