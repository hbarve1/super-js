#include "parser/AST.h"

namespace superjs {

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

void IfStatement::accept(ASTVisitor& visitor) {
    visitor.visitIfStatement(*this);
}

void WhileStatement::accept(ASTVisitor& visitor) {
    visitor.visitWhileStatement(*this);
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

} // namespace superjs 