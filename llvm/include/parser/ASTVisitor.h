#pragma once

#include "../ast/Statement.h"
#include "../ast/Expression.h"
#include "../ast/Type.h"

namespace superjs {

// Forward declarations
class PrimitiveType;
class ObjectType;
class FunctionType;
class GenericType;
class UnionType;
class ExpressionStatement;
class AssignmentExpression;
class BinaryExpression;
class UnaryExpression;
class LiteralExpression;
class IdentifierExpression;
class VariableExpression;
class CallExpression;
class MemberExpression;
class FunctionExpression;
class ClassExpression;
class JSXExpression;
class IfStatement;
class WhileStatement;
class ForStatement;
class BlockStatement;
class FunctionDeclaration;
class VariableDeclaration;
class ReturnStatement;
class ClassDeclaration;
class ImportStatement;
class ExportStatement;
class TypeDeclaration;
class InterfaceDeclaration;
class GetExpression;
class GroupingExpression;

class ASTVisitor : public StatementVisitor, public ExpressionVisitor, public TypeVisitor {
public:
    virtual ~ASTVisitor() = default;

    // Type visitor methods
    void visitPrimitiveType(PrimitiveType* type) override = 0;
    void visitArrayType(ArrayType* type) override = 0;
    void visitFunctionType(FunctionType* type) override = 0;
    void visitObjectType(ObjectType* type) override = 0;
    void visitUnionType(UnionType* type) override = 0;
    void visitIntersectionType(IntersectionType* type) override = 0;
    void visitGenericType(GenericType* type) override = 0;

    // Expression visitor methods
    void visitBinaryExpression(BinaryExpression* expr) override = 0;
    void visitUnaryExpression(UnaryExpression* expr) override = 0;
    void visitLiteralExpression(LiteralExpression* expr) override = 0;
    void visitIdentifierExpression(IdentifierExpression* expr) override = 0;
    void visitVariableExpression(VariableExpression* expr) override = 0;
    void visitAssignmentExpression(AssignmentExpression* expr) override = 0;
    void visitCallExpression(CallExpression* expr) override = 0;
    void visitMemberExpression(MemberExpression* expr) override = 0;
    void visitFunctionExpression(FunctionExpression* expr) override = 0;
    void visitClassExpression(ClassExpression* expr) override = 0;
    void visitJSXExpression(JSXExpression* expr) override = 0;
    void visitGetExpression(GetExpression* expr) override = 0;
    void visitGroupingExpression(GroupingExpression* expr) override = 0;
    void visitSetExpression(SetExpression* expr) override = 0;
    void visitThisExpression(ThisExpression* expr) override = 0;
    void visitSuperExpression(SuperExpression* expr) override = 0;

    // Statement visitor methods
    void visitBlockStatement(BlockStatement* stmt) override = 0;
    void visitExpressionStatement(ExpressionStatement* stmt) override = 0;
    void visitIfStatement(IfStatement* stmt) override = 0;
    void visitWhileStatement(WhileStatement* stmt) override = 0;
    void visitForStatement(ForStatement* stmt) override = 0;
    void visitFunctionDeclaration(FunctionDeclaration* stmt) override = 0;
    void visitVariableDeclaration(VariableDeclaration* stmt) override = 0;
    void visitReturnStatement(ReturnStatement* stmt) override = 0;
    void visitClassDeclaration(ClassDeclaration* stmt) override = 0;
    void visitBreakStatement(BreakStatement* stmt) override = 0;
    void visitContinueStatement(ContinueStatement* stmt) override = 0;
    void visitImportStatement(ImportStatement* stmt) override = 0;
    void visitExportStatement(ExportStatement* stmt) override = 0;
    void visitTypeDeclaration(TypeDeclaration* stmt) override = 0;
    void visitInterfaceDeclaration(InterfaceDeclaration* stmt) override = 0;
};

} // namespace superjs 