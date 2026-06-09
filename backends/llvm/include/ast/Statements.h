#pragma once

#include "Statement.h"
#include "Expression.h"
#include "Type.h"
#include <memory>
#include <vector>
#include <string>

namespace superjs {

// Forward declarations
class StatementVisitor;

class BlockStatement : public Statement {
public:
    explicit BlockStatement(std::vector<std::unique_ptr<Statement>> statements)
        : statements(std::move(statements)) {}

    void accept(StatementVisitor& visitor) override { visitor.visitBlockStatement(this); }

    std::vector<std::unique_ptr<Statement>> statements;
};

class ExpressionStatement : public Statement {
public:
    explicit ExpressionStatement(std::unique_ptr<Expression> expression)
        : expression(std::move(expression)) {}

    void accept(StatementVisitor& visitor) override { visitor.visitExpressionStatement(this); }

    std::unique_ptr<Expression> expression;
};

class IfStatement : public Statement {
public:
    IfStatement(std::unique_ptr<Expression> condition,
                std::unique_ptr<Statement> thenBranch,
                std::unique_ptr<Statement> elseBranch)
        : condition(std::move(condition)),
          thenBranch(std::move(thenBranch)),
          elseBranch(std::move(elseBranch)) {}

    void accept(StatementVisitor& visitor) override { visitor.visitIfStatement(this); }

    std::unique_ptr<Expression> condition;
    std::unique_ptr<Statement> thenBranch;
    std::unique_ptr<Statement> elseBranch;
};

class WhileStatement : public Statement {
public:
    WhileStatement(std::unique_ptr<Expression> condition,
                   std::unique_ptr<Statement> body)
        : condition(std::move(condition)),
          body(std::move(body)) {}

    void accept(StatementVisitor& visitor) override { visitor.visitWhileStatement(this); }

    std::unique_ptr<Expression> condition;
    std::unique_ptr<Statement> body;
};

class ForStatement : public Statement {
public:
    ForStatement(std::unique_ptr<Statement> initializer,
                 std::unique_ptr<Expression> condition,
                 std::unique_ptr<Expression> increment,
                 std::unique_ptr<Statement> body)
        : initializer(std::move(initializer)),
          condition(std::move(condition)),
          increment(std::move(increment)),
          body(std::move(body)) {}

    void accept(StatementVisitor& visitor) override { visitor.visitForStatement(this); }

    std::unique_ptr<Statement> initializer;
    std::unique_ptr<Expression> condition;
    std::unique_ptr<Expression> increment;
    std::unique_ptr<Statement> body;
};

class FunctionDeclaration : public Statement {
public:
    FunctionDeclaration(Token name,
                       std::vector<Token> params,
                       std::vector<std::unique_ptr<Type>> paramTypes,
                       std::unique_ptr<Type> returnType,
                       std::unique_ptr<Statement> body)
        : name(name),
          params(std::move(params)),
          paramTypes(std::move(paramTypes)),
          returnType(std::move(returnType)),
          body(std::move(body)) {}

    void accept(StatementVisitor& visitor) override { visitor.visitFunctionDeclaration(this); }

    Token name;
    std::vector<Token> params;
    std::vector<std::unique_ptr<Type>> paramTypes;
    std::unique_ptr<Type> returnType;
    std::unique_ptr<Statement> body;
};

class ClassDeclaration : public Statement {
public:
    ClassDeclaration(Token name,
                    std::unique_ptr<Expression> superclass,
                    std::vector<std::unique_ptr<Statement>> methods)
        : name(name),
          superclass(std::move(superclass)),
          methods(std::move(methods)) {}

    void accept(StatementVisitor& visitor) override { visitor.visitClassDeclaration(this); }

    Token name;
    std::unique_ptr<Expression> superclass;
    std::vector<std::unique_ptr<Statement>> methods;
};

class ReturnStatement : public Statement {
public:
    ReturnStatement(Token keyword, std::unique_ptr<Expression> value)
        : keyword(keyword), value(std::move(value)) {}

    void accept(StatementVisitor& visitor) override { visitor.visitReturnStatement(this); }

    Token keyword;
    std::unique_ptr<Expression> value;
};

class BreakStatement : public Statement {
public:
    explicit BreakStatement(Token keyword) : keyword(keyword) {}

    void accept(StatementVisitor& visitor) override { visitor.visitBreakStatement(this); }

    Token keyword;
};

class ContinueStatement : public Statement {
public:
    explicit ContinueStatement(Token keyword) : keyword(keyword) {}

    void accept(StatementVisitor& visitor) override { visitor.visitContinueStatement(this); }

    Token keyword;
};

class VariableDeclaration : public Statement {
public:
    VariableDeclaration(Token name,
                       std::unique_ptr<Type> typeAnnotation,
                       std::unique_ptr<Expression> initializer)
        : name(name),
          typeAnnotation(std::move(typeAnnotation)),
          initializer(std::move(initializer)) {}

    void accept(StatementVisitor& visitor) override { visitor.visitVariableDeclaration(this); }

    Token name;
    std::unique_ptr<Type> typeAnnotation;
    std::unique_ptr<Expression> initializer;
};

class ImportStatement : public Statement {
public:
    ImportStatement(Token module, std::vector<Token> names)
        : module(module), names(std::move(names)) {}

    void accept(StatementVisitor& visitor) override { visitor.visitImportStatement(this); }

    Token module;
    std::vector<Token> names;
};

class ExportStatement : public Statement {
public:
    explicit ExportStatement(std::unique_ptr<Statement> declaration)
        : declaration(std::move(declaration)) {}

    void accept(StatementVisitor& visitor) override { visitor.visitExportStatement(this); }

    std::unique_ptr<Statement> declaration;
};

class TypeDeclaration : public Statement {
public:
    TypeDeclaration(Token name, std::unique_ptr<Type> type)
        : name(name), type(std::move(type)) {}

    void accept(StatementVisitor& visitor) override { visitor.visitTypeDeclaration(this); }

    Token name;
    std::unique_ptr<Type> type;
};

class InterfaceDeclaration : public Statement {
public:
    InterfaceDeclaration(Token name,
                        std::vector<std::pair<Token, std::unique_ptr<Type>>> properties)
        : name(name), properties(std::move(properties)) {}

    void accept(StatementVisitor& visitor) override { visitor.visitInterfaceDeclaration(this); }

    Token name;
    std::vector<std::pair<Token, std::unique_ptr<Type>>> properties;
};

} // namespace superjs 