#pragma once

#include "ASTVisitor.h"
#include "../ast/Statements.h"
#include "../ast/Expressions.h"
#include "../ast/Types.h"
#include <iostream>
#include <string>

namespace superjs {

class ASTPrinter : public ASTVisitor {
public:
    explicit ASTPrinter(std::ostream& out = std::cout) : out_(out), indent_(0) {}

    // Statement visitor methods
    void visitBlockStatement(BlockStatement* stmt) override;
    void visitExpressionStatement(ExpressionStatement* stmt) override;
    void visitIfStatement(IfStatement* stmt) override;
    void visitWhileStatement(WhileStatement* stmt) override;
    void visitForStatement(ForStatement* stmt) override;
    void visitFunctionDeclaration(FunctionDeclaration* stmt) override;
    void visitVariableDeclaration(VariableDeclaration* stmt) override;
    void visitReturnStatement(ReturnStatement* stmt) override;
    void visitClassDeclaration(ClassDeclaration* stmt) override;
    void visitImportStatement(ImportStatement* stmt) override;
    void visitExportStatement(ExportStatement* stmt) override;
    void visitTypeDeclaration(TypeDeclaration* stmt) override;
    void visitInterfaceDeclaration(InterfaceDeclaration* stmt) override;
    void visitBreakStatement(BreakStatement* stmt) override;
    void visitContinueStatement(ContinueStatement* stmt) override;

    // Expression visitor methods
    void visitBinaryExpression(BinaryExpression* expr) override;
    void visitUnaryExpression(UnaryExpression* expr) override;
    void visitLiteralExpression(LiteralExpression* expr) override;
    void visitIdentifierExpression(IdentifierExpression* expr) override;
    void visitVariableExpression(VariableExpression* expr) override;
    void visitAssignmentExpression(AssignmentExpression* expr) override;
    void visitCallExpression(CallExpression* expr) override;
    void visitMemberExpression(MemberExpression* expr) override;
    void visitGetExpression(GetExpression* expr) override;
    void visitSetExpression(SetExpression* expr) override;
    void visitThisExpression(ThisExpression* expr) override;
    void visitSuperExpression(SuperExpression* expr) override;
    void visitFunctionExpression(FunctionExpression* expr) override;
    void visitClassExpression(ClassExpression* expr) override;
    void visitJSXExpression(JSXExpression* expr) override;
    void visitGroupingExpression(GroupingExpression* expr) override;

    // Type visitor methods
    void visitPrimitiveType(PrimitiveType* type) override;
    void visitArrayType(ArrayType* type) override;
    void visitObjectType(ObjectType* type) override;
    void visitFunctionType(FunctionType* type) override;
    void visitGenericType(GenericType* type) override;
    void visitUnionType(UnionType* type) override;
    void visitIntersectionType(IntersectionType* type) override;

private:
    void printIndent();
    std::ostream& out_;
    int indent_;
};

} // namespace superjs 