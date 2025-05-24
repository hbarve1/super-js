#include "parser/AST.h"
#include "lexer/Lexer.h"
#include <stdexcept>

namespace superjs {

void BinaryExpression::accept(ExpressionVisitor& visitor) {
    visitor.visitBinaryExpression(*this);
}

void UnaryExpression::accept(ExpressionVisitor& visitor) {
    visitor.visitUnaryExpression(*this);
}

void LiteralExpression::accept(ExpressionVisitor& visitor) {
    visitor.visitLiteralExpression(*this);
}

void VariableExpression::accept(ExpressionVisitor& visitor) {
    visitor.visitVariableExpression(*this);
}

void AssignmentExpression::accept(ExpressionVisitor& visitor) {
    visitor.visitAssignmentExpression(*this);
}

void CallExpression::accept(ExpressionVisitor& visitor) {
    visitor.visitCallExpression(*this);
}

void MemberExpression::accept(ExpressionVisitor& visitor) {
    visitor.visitMemberExpression(*this);
}

void FunctionExpression::accept(ExpressionVisitor& visitor) {
    visitor.visitFunctionExpression(*this);
}

void ClassExpression::accept(ExpressionVisitor& visitor) {
    visitor.visitClassExpression(*this);
}

void JSXExpression::accept(ExpressionVisitor& visitor) {
    visitor.visitJSXExpression(*this);
}

void BlockStatement::accept(StatementVisitor& visitor) {
    visitor.visitBlockStatement(*this);
}

void ExpressionStatement::accept(StatementVisitor& visitor) {
    visitor.visitExpressionStatement(*this);
}

void IfStatement::accept(StatementVisitor& visitor) {
    visitor.visitIfStatement(*this);
}

void WhileStatement::accept(StatementVisitor& visitor) {
    visitor.visitWhileStatement(*this);
}

void ForStatement::accept(StatementVisitor& visitor) {
    visitor.visitForStatement(*this);
}

void ReturnStatement::accept(StatementVisitor& visitor) {
    visitor.visitReturnStatement(*this);
}

void FunctionDeclaration::accept(StatementVisitor& visitor) {
    visitor.visitFunctionDeclaration(*this);
}

void ClassDeclaration::accept(StatementVisitor& visitor) {
    visitor.visitClassDeclaration(*this);
}

void ImportStatement::accept(StatementVisitor& visitor) {
    visitor.visitImportStatement(*this);
}

void ExportStatement::accept(StatementVisitor& visitor) {
    visitor.visitExportStatement(*this);
}

void TypeDeclaration::accept(StatementVisitor& visitor) {
    visitor.visitTypeDeclaration(*this);
}

void InterfaceDeclaration::accept(StatementVisitor& visitor) {
    visitor.visitInterfaceDeclaration(*this);
}

void VariableDeclaration::accept(StatementVisitor& visitor) {
    visitor.visitVariableDeclaration(*this);
}

} // namespace superjs 