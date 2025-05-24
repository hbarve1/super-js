#include "../../include/parser/ASTVisitor.h"
#include "../../include/parser/AST.h"

namespace superjs {

// Type accept implementations
void PrimitiveType::accept(ASTVisitor& visitor) {
    visitor.visitPrimitiveType(*this);
}

void ObjectType::accept(ASTVisitor& visitor) {
    visitor.visitObjectType(*this);
}

void FunctionType::accept(ASTVisitor& visitor) {
    visitor.visitFunctionType(*this);
}

void GenericType::accept(ASTVisitor& visitor) {
    visitor.visitGenericType(*this);
}

void UnionType::accept(ASTVisitor& visitor) {
    visitor.visitUnionType(*this);
}

// Expression accept implementations
void ExpressionStatement::accept(ASTVisitor& visitor) {
    visitor.visitExpressionStatement(*this);
}

void AssignmentExpression::accept(ASTVisitor& visitor) {
    visitor.visitAssignmentExpression(*this);
}

void BinaryExpression::accept(ASTVisitor& visitor) {
    visitor.visitBinaryExpression(*this);
}

void UnaryExpression::accept(ASTVisitor& visitor) {
    visitor.visitUnaryExpression(*this);
}

void LiteralExpression::accept(ASTVisitor& visitor) {
    visitor.visitLiteralExpression(*this);
}

void IdentifierExpression::accept(ASTVisitor& visitor) {
    visitor.visitIdentifierExpression(*this);
}

void VariableExpression::accept(ASTVisitor& visitor) {
    visitor.visitVariableExpression(*this);
}

void CallExpression::accept(ASTVisitor& visitor) {
    visitor.visitCallExpression(*this);
}

void MemberExpression::accept(ASTVisitor& visitor) {
    visitor.visitMemberExpression(*this);
}

void FunctionExpression::accept(ASTVisitor& visitor) {
    visitor.visitFunctionExpression(*this);
}

void ClassExpression::accept(ASTVisitor& visitor) {
    visitor.visitClassExpression(*this);
}

void JSXExpression::accept(ASTVisitor& visitor) {
    visitor.visitJSXExpression(*this);
}

void GetExpression::accept(ASTVisitor& visitor) { visitor.visitGetExpression(*this); }
void GroupingExpression::accept(ASTVisitor& visitor) { visitor.visitGroupingExpression(*this); }

// Statement accept implementations
void IfStatement::accept(ASTVisitor& visitor) {
    visitor.visitIfStatement(*this);
}

void WhileStatement::accept(ASTVisitor& visitor) {
    visitor.visitWhileStatement(*this);
}

void ForStatement::accept(ASTVisitor& visitor) {
    visitor.visitForStatement(*this);
}

void BlockStatement::accept(ASTVisitor& visitor) {
    visitor.visitBlockStatement(*this);
}

void FunctionDeclaration::accept(ASTVisitor& visitor) {
    visitor.visitFunctionDeclaration(*this);
}

void VariableDeclaration::accept(ASTVisitor& visitor) {
    visitor.visitVariableDeclaration(*this);
}

void ReturnStatement::accept(ASTVisitor& visitor) {
    visitor.visitReturnStatement(*this);
}

void ClassDeclaration::accept(ASTVisitor& visitor) {
    visitor.visitClassDeclaration(*this);
}

void ImportStatement::accept(ASTVisitor& visitor) {
    visitor.visitImportStatement(*this);
}

void ExportStatement::accept(ASTVisitor& visitor) {
    visitor.visitExportStatement(*this);
}

void TypeDeclaration::accept(ASTVisitor& visitor) {
    visitor.visitTypeDeclaration(*this);
}

void InterfaceDeclaration::accept(ASTVisitor& visitor) {
    visitor.visitInterfaceDeclaration(*this);
}

} // namespace superjs 