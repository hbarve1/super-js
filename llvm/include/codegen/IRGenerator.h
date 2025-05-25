#pragma once

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>
#include "../ast/Statement.h"
#include "../ast/Expression.h"
#include "../ast/Type.h"
#include "../ast/Statements.h"
#include "../ast/Expressions.h"
#include "../ast/Types.h"
#include <llvm/IR/IRBuilder.h>
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>
#include <llvm/IR/Value.h>

namespace superjs {

class IRGenerator : public StatementVisitor, public ExpressionVisitor {
public:
    IRGenerator();
    ~IRGenerator() = default;

    // Main entry point for IR generation
    std::unique_ptr<llvm::Module> generate(const std::vector<std::unique_ptr<Statement>>& statements);

    // Error handling
    bool hasErrors() const { return !errors_.empty(); }
    const std::vector<std::string>& getErrors() const { return errors_; }

    // Statement visitor methods
    void visitBlockStatement(BlockStatement* stmt) override;
    void visitExpressionStatement(ExpressionStatement* stmt) override;
    void visitIfStatement(IfStatement* stmt) override;
    void visitWhileStatement(WhileStatement* stmt) override;
    void visitForStatement(ForStatement* stmt) override;
    void visitFunctionDeclaration(FunctionDeclaration* stmt) override;
    void visitClassDeclaration(ClassDeclaration* stmt) override;
    void visitReturnStatement(ReturnStatement* stmt) override;
    void visitBreakStatement(BreakStatement* stmt) override;
    void visitContinueStatement(ContinueStatement* stmt) override;
    void visitVariableDeclaration(VariableDeclaration* stmt) override;
    void visitImportStatement(ImportStatement* stmt) override;
    void visitExportStatement(ExportStatement* stmt) override;
    void visitTypeDeclaration(TypeDeclaration* stmt) override;
    void visitInterfaceDeclaration(InterfaceDeclaration* stmt) override;

    // Expression visitor methods
    void visitBinaryExpression(BinaryExpression* expr) override;
    void visitUnaryExpression(UnaryExpression* expr) override;
    void visitLiteralExpression(LiteralExpression* expr) override;
    void visitVariableExpression(VariableExpression* expr) override;
    void visitAssignmentExpression(AssignmentExpression* expr) override;
    void visitCallExpression(CallExpression* expr) override;
    void visitGetExpression(GetExpression* expr) override;
    void visitSetExpression(SetExpression* expr) override;
    void visitThisExpression(ThisExpression* expr) override;
    void visitSuperExpression(SuperExpression* expr) override;
    void visitFunctionExpression(FunctionExpression* expr) override;
    void visitClassExpression(ClassExpression* expr) override;
    void visitJSXExpression(JSXExpression* expr) override;
    void visitGroupingExpression(GroupingExpression* expr) override;
    void visitIdentifierExpression(IdentifierExpression* expr) override;
    void visitMemberExpression(MemberExpression* expr) override;

protected:
    // Current IR value being generated
    llvm::Value* result_ = nullptr;

private:
    // Helper methods
    void reportError(const std::string& message);
    llvm::Type* getLLVMType(const Type* type);
    llvm::Value* getVariableValue(const std::string& name);
    void setVariableValue(const std::string& name, llvm::Value* value);

    // LLVM context and builder
    std::unique_ptr<llvm::LLVMContext> context_;
    std::unique_ptr<llvm::Module> module_;
    std::unique_ptr<llvm::IRBuilder<>> builder_;

    // Symbol table for variables
    std::unordered_map<std::string, llvm::Value*> variables_;

    // Error handling
    std::vector<std::string> errors_;
};

} // namespace superjs 