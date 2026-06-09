#pragma once

#include "Expression.h"
#include "Type.h"
#include <memory>
#include <vector>
#include <string>

namespace superjs {

// Forward declarations
class Statement;

class BinaryExpression : public Expression {
public:
    BinaryExpression(std::unique_ptr<Expression> left,
                    Token op,
                    std::unique_ptr<Expression> right)
        : left(std::move(left)),
          op(op),
          right(std::move(right)) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitBinaryExpression(this); }

    std::unique_ptr<Expression> left;
    Token op;
    std::unique_ptr<Expression> right;
};

class UnaryExpression : public Expression {
public:
    UnaryExpression(Token op, std::unique_ptr<Expression> right)
        : op(op), right(std::move(right)) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitUnaryExpression(this); }

    Token op;
    std::unique_ptr<Expression> right;
};

class LiteralExpression : public Expression {
public:
    explicit LiteralExpression(Token value) : value(value) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitLiteralExpression(this); }

    Token value;
};

class IdentifierExpression : public Expression {
public:
    explicit IdentifierExpression(Token name) : name(name) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitIdentifierExpression(this); }

    Token name;
};

class VariableExpression : public Expression {
public:
    explicit VariableExpression(Token name) : name(name) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitVariableExpression(this); }

    Token name;
};

class AssignmentExpression : public Expression {
public:
    AssignmentExpression(Token name, std::unique_ptr<Expression> value)
        : name(name), value(std::move(value)) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitAssignmentExpression(this); }

    Token name;
    std::unique_ptr<Expression> value;
};

class CallExpression : public Expression {
public:
    CallExpression(std::unique_ptr<Expression> callee,
                  Token paren,
                  std::vector<std::unique_ptr<Expression>> arguments)
        : callee(std::move(callee)),
          paren(paren),
          arguments(std::move(arguments)) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitCallExpression(this); }

    std::unique_ptr<Expression> callee;
    Token paren;
    std::vector<std::unique_ptr<Expression>> arguments;
};

class MemberExpression : public Expression {
public:
    MemberExpression(std::unique_ptr<Expression> object,
                    std::unique_ptr<Expression> property)
        : object(std::move(object)),
          property(std::move(property)) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitMemberExpression(this); }

    std::unique_ptr<Expression> object;
    std::unique_ptr<Expression> property;
};

class GetExpression : public Expression {
public:
    GetExpression(std::unique_ptr<Expression> object, Token name)
        : object(std::move(object)), name(name) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitGetExpression(this); }

    std::unique_ptr<Expression> object;
    Token name;
};

class SetExpression : public Expression {
public:
    SetExpression(std::unique_ptr<Expression> object,
                 Token name,
                 std::unique_ptr<Expression> value)
        : object(std::move(object)),
          name(name),
          value(std::move(value)) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitSetExpression(this); }

    std::unique_ptr<Expression> object;
    Token name;
    std::unique_ptr<Expression> value;
};

class ThisExpression : public Expression {
public:
    explicit ThisExpression(Token keyword) : keyword(keyword) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitThisExpression(this); }

    Token keyword;
};

class SuperExpression : public Expression {
public:
    SuperExpression(Token keyword, Token method)
        : keyword(keyword), method(method) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitSuperExpression(this); }

    Token keyword;
    Token method;
};

class FunctionExpression : public Expression {
public:
    FunctionExpression(std::vector<Token> params,
                      std::vector<std::unique_ptr<Type>> paramTypes,
                      std::unique_ptr<Type> returnType,
                      std::unique_ptr<Statement> body)
        : params(std::move(params)),
          paramTypes(std::move(paramTypes)),
          returnType(std::move(returnType)),
          body(std::move(body)) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitFunctionExpression(this); }

    std::vector<Token> params;
    std::vector<std::unique_ptr<Type>> paramTypes;
    std::unique_ptr<Type> returnType;
    std::unique_ptr<Statement> body;
};

class ClassExpression : public Expression {
public:
    ClassExpression(std::unique_ptr<Expression> superclass,
                   std::vector<std::unique_ptr<Expression>> methods)
        : superclass(std::move(superclass)),
          methods(std::move(methods)) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitClassExpression(this); }

    std::unique_ptr<Expression> superclass;
    std::vector<std::unique_ptr<Expression>> methods;
};

class JSXExpression : public Expression {
public:
    JSXExpression(Token tag,
                 std::vector<std::pair<Token, std::unique_ptr<Expression>>> props,
                 std::vector<std::unique_ptr<Expression>> children)
        : tag(tag),
          props(std::move(props)),
          children(std::move(children)) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitJSXExpression(this); }

    Token tag;
    std::vector<std::pair<Token, std::unique_ptr<Expression>>> props;
    std::vector<std::unique_ptr<Expression>> children;
};

class GroupingExpression : public Expression {
public:
    explicit GroupingExpression(std::unique_ptr<Expression> expression)
        : expression(std::move(expression)) {}

    void accept(ExpressionVisitor& visitor) override { visitor.visitGroupingExpression(this); }

    std::unique_ptr<Expression> expression;
};

} // namespace superjs 