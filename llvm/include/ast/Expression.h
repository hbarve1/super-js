#pragma once

#include "../lexer/Token.h"
#include "Type.h"
#include <memory>
#include <vector>
#include <string>

namespace superjs {

class Expression {
public:
    virtual ~Expression() = default;
    virtual void accept(class ExpressionVisitor& visitor) = 0;
    std::shared_ptr<Type> type;
};

class ExpressionVisitor {
public:
    virtual ~ExpressionVisitor() = default;
    virtual void visitBinaryExpression(class BinaryExpression* expr) = 0;
    virtual void visitUnaryExpression(class UnaryExpression* expr) = 0;
    virtual void visitLiteralExpression(class LiteralExpression* expr) = 0;
    virtual void visitIdentifierExpression(class IdentifierExpression* expr) = 0;
    virtual void visitVariableExpression(class VariableExpression* expr) = 0;
    virtual void visitAssignmentExpression(class AssignmentExpression* expr) = 0;
    virtual void visitCallExpression(class CallExpression* expr) = 0;
    virtual void visitMemberExpression(class MemberExpression* expr) = 0;
    virtual void visitGetExpression(class GetExpression* expr) = 0;
    virtual void visitSetExpression(class SetExpression* expr) = 0;
    virtual void visitThisExpression(class ThisExpression* expr) = 0;
    virtual void visitSuperExpression(class SuperExpression* expr) = 0;
    virtual void visitFunctionExpression(class FunctionExpression* expr) = 0;
    virtual void visitClassExpression(class ClassExpression* expr) = 0;
    virtual void visitJSXExpression(class JSXExpression* expr) = 0;
    virtual void visitGroupingExpression(class GroupingExpression* expr) = 0;
};

} // namespace superjs 