#pragma once

#include <string>
#include <unordered_map>
#include <memory>
#include <vector>
#include "../ast/Statements.h"
#include "../ast/Expressions.h"
#include "../ast/Type.h"
#include "../ast/Types.h"
#include "../ast/Statement.h"
#include "../ast/Expression.h"

namespace superjs {

// Forward declarations
class Expression;
class Statement;
class Type;
class SymbolTable;

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
class SemanticAnalyzer : public StatementVisitor, public ExpressionVisitor, public TypeVisitor {
public:
    SemanticAnalyzer();
    
    // Main analysis entry point
    void analyze(const std::vector<std::unique_ptr<Statement>>& statements);

    // Error handling
    bool hasErrors() const { return !errors_.empty(); }
    const std::vector<std::string>& getErrors() const { return errors_; }

    // Statement visitor methods
    virtual void visitBlockStatement(BlockStatement* stmt) override;
    virtual void visitExpressionStatement(ExpressionStatement* stmt) override;
    virtual void visitIfStatement(IfStatement* stmt) override;
    virtual void visitWhileStatement(WhileStatement* stmt) override;
    virtual void visitForStatement(ForStatement* stmt) override;
    virtual void visitFunctionDeclaration(FunctionDeclaration* stmt) override;
    virtual void visitClassDeclaration(ClassDeclaration* stmt) override;
    virtual void visitReturnStatement(ReturnStatement* stmt) override;
    virtual void visitBreakStatement(BreakStatement* stmt) override;
    virtual void visitContinueStatement(ContinueStatement* stmt) override;
    virtual void visitVariableDeclaration(VariableDeclaration* stmt) override;
    virtual void visitImportStatement(ImportStatement* stmt) override;
    virtual void visitExportStatement(ExportStatement* stmt) override;
    virtual void visitTypeDeclaration(TypeDeclaration* stmt) override;
    virtual void visitInterfaceDeclaration(InterfaceDeclaration* stmt) override;

    // Expression visitor methods
    virtual void visitBinaryExpression(BinaryExpression* expr) override;
    virtual void visitUnaryExpression(UnaryExpression* expr) override;
    virtual void visitLiteralExpression(LiteralExpression* expr) override;
    virtual void visitVariableExpression(VariableExpression* expr) override;
    virtual void visitAssignmentExpression(AssignmentExpression* expr) override;
    virtual void visitCallExpression(CallExpression* expr) override;
    virtual void visitGetExpression(GetExpression* expr) override;
    virtual void visitSetExpression(SetExpression* expr) override;
    virtual void visitThisExpression(ThisExpression* expr) override;
    virtual void visitSuperExpression(SuperExpression* expr) override;
    virtual void visitFunctionExpression(FunctionExpression* expr) override;
    virtual void visitClassExpression(ClassExpression* expr) override;
    virtual void visitJSXExpression(JSXExpression* expr) override;
    virtual void visitGroupingExpression(GroupingExpression* expr) override;

    // Type visitor methods
    virtual void visitPrimitiveType(PrimitiveType* type) override;
    virtual void visitArrayType(ArrayType* type) override;
    virtual void visitFunctionType(FunctionType* type) override;
    virtual void visitObjectType(ObjectType* type) override;
    virtual void visitUnionType(UnionType* type) override;
    virtual void visitIntersectionType(IntersectionType* type) override;
    virtual void visitGenericType(GenericType* type) override;

private:
    // Helper methods
    void enterScope();
    void exitScope();
    void reportError(const std::string& message);
    std::shared_ptr<Type> visitExpression(Expression* expr);

    std::shared_ptr<SymbolTable> currentScope_;
    std::vector<std::string> errors_;
};

} // namespace superjs 