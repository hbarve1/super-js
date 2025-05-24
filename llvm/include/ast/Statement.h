#pragma once

#include "../lexer/Token.h"
#include <memory>
#include <vector>
#include <string>

namespace superjs {

class Statement {
public:
    virtual ~Statement() = default;
    virtual void accept(class StatementVisitor& visitor) = 0;
};

class StatementVisitor {
public:
    virtual ~StatementVisitor() = default;
    virtual void visitBlockStatement(class BlockStatement* stmt) = 0;
    virtual void visitExpressionStatement(class ExpressionStatement* stmt) = 0;
    virtual void visitIfStatement(class IfStatement* stmt) = 0;
    virtual void visitWhileStatement(class WhileStatement* stmt) = 0;
    virtual void visitForStatement(class ForStatement* stmt) = 0;
    virtual void visitFunctionDeclaration(class FunctionDeclaration* stmt) = 0;
    virtual void visitClassDeclaration(class ClassDeclaration* stmt) = 0;
    virtual void visitReturnStatement(class ReturnStatement* stmt) = 0;
    virtual void visitBreakStatement(class BreakStatement* stmt) = 0;
    virtual void visitContinueStatement(class ContinueStatement* stmt) = 0;
    virtual void visitVariableDeclaration(class VariableDeclaration* stmt) = 0;
    virtual void visitImportStatement(class ImportStatement* stmt) = 0;
    virtual void visitExportStatement(class ExportStatement* stmt) = 0;
    virtual void visitTypeDeclaration(class TypeDeclaration* stmt) = 0;
    virtual void visitInterfaceDeclaration(class InterfaceDeclaration* stmt) = 0;
};

} // namespace superjs 