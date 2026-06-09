#pragma once

#include "../ast/Statements.h"
#include "../ast/Expressions.h"
#include "../ast/Type.h"
#include "../ast/Types.h"
#include "../lexer/Token.h"
#include "SymbolTable.h"
#include <memory>
#include <vector>
#include <string>

namespace superjs {

// Forward declarations
class Type;
class SymbolTable;

// Semantic analyzer
class SemanticAnalyzer : public StatementVisitor, public ExpressionVisitor, public TypeVisitor {
public:
    explicit SemanticAnalyzer() : currentScope_(nullptr) {}
    
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
    virtual void visitIdentifierExpression(IdentifierExpression* expr) override;
    virtual void visitMemberExpression(MemberExpression* expr) override;

    // Type visitor methods
    virtual void visitPrimitiveType(PrimitiveType* type) override;
    virtual void visitArrayType(ArrayType* type) override;
    virtual void visitFunctionType(FunctionType* type) override;
    virtual void visitObjectType(ObjectType* type) override;
    virtual void visitUnionType(UnionType* type) override;
    virtual void visitIntersectionType(IntersectionType* type) override;
    virtual void visitGenericType(GenericType* type) override;

    // Helper methods
    std::shared_ptr<Type> getExpressionType(Expression* expr);
    void reportError(const Token& token, const std::string& message);
    bool isTypeCompatible(const Type* expected, const Type* actual);
    std::string typeToString(const Type* type);

private:
    void enterScope();
    void exitScope();
    std::shared_ptr<SymbolTable> currentScope_;
    std::vector<std::string> errors_;
};

} // namespace superjs 