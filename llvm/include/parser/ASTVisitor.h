#pragma once

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

class ASTVisitor {
public:
    virtual ~ASTVisitor() = default;

    // Type visitor methods
    virtual void visitPrimitiveType(PrimitiveType& type) = 0;
    virtual void visitObjectType(ObjectType& type) = 0;
    virtual void visitFunctionType(FunctionType& type) = 0;
    virtual void visitGenericType(GenericType& type) = 0;
    virtual void visitUnionType(UnionType& type) = 0;

    // Expression visitor methods
    virtual void visitExpressionStatement(ExpressionStatement& stmt) = 0;
    virtual void visitAssignmentExpression(AssignmentExpression& expr) = 0;
    virtual void visitBinaryExpression(BinaryExpression& expr) = 0;
    virtual void visitUnaryExpression(UnaryExpression& expr) = 0;
    virtual void visitLiteralExpression(LiteralExpression& expr) = 0;
    virtual void visitIdentifierExpression(IdentifierExpression& expr) = 0;
    virtual void visitVariableExpression(VariableExpression& expr) = 0;
    virtual void visitCallExpression(CallExpression& expr) = 0;
    virtual void visitMemberExpression(MemberExpression& expr) = 0;
    virtual void visitFunctionExpression(FunctionExpression& expr) = 0;
    virtual void visitClassExpression(ClassExpression& expr) = 0;
    virtual void visitJSXExpression(JSXExpression& expr) = 0;

    // Statement visitor methods
    virtual void visitIfStatement(IfStatement& stmt) = 0;
    virtual void visitWhileStatement(WhileStatement& stmt) = 0;
    virtual void visitForStatement(ForStatement& stmt) = 0;
    virtual void visitBlockStatement(BlockStatement& stmt) = 0;
    virtual void visitFunctionDeclaration(FunctionDeclaration& stmt) = 0;
    virtual void visitVariableDeclaration(VariableDeclaration& stmt) = 0;
    virtual void visitReturnStatement(ReturnStatement& stmt) = 0;
    virtual void visitClassDeclaration(ClassDeclaration& stmt) = 0;
    virtual void visitImportStatement(ImportStatement& stmt) = 0;
    virtual void visitExportStatement(ExportStatement& stmt) = 0;
    virtual void visitTypeDeclaration(TypeDeclaration& stmt) = 0;
    virtual void visitInterfaceDeclaration(InterfaceDeclaration& stmt) = 0;
};

} // namespace superjs 