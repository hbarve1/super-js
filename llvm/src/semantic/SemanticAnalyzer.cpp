#include "../../include/semantic/SemanticAnalyzer.h"
#include "../../include/parser/AST.h"
#include <stdexcept>

namespace superjs {

SemanticAnalyzer::SemanticAnalyzer() {
    currentScope_ = std::make_shared<SymbolTable>();
}

void SemanticAnalyzer::analyze(const std::vector<std::unique_ptr<Statement>>& statements) {
    for (const auto& stmt : statements) {
        stmt->accept(*this);
    }
}

void SemanticAnalyzer::enterScope() {
    currentScope_ = std::make_shared<SymbolTable>(currentScope_);
}

void SemanticAnalyzer::exitScope() {
    if (currentScope_->getParent()) {
        currentScope_ = currentScope_->getParent();
    }
}

void SemanticAnalyzer::reportError(const std::string& message) {
    errors_.push_back(message);
}

std::shared_ptr<Type> SemanticAnalyzer::visitExpression(Expression& expr) {
    expr.accept(*this);
    return nullptr; // TODO: Implement proper type inference
}

// ASTVisitor implementations
void SemanticAnalyzer::visitExpressionStatement(ExpressionStatement& stmt) {
    visitExpression(*stmt.expression);
}

void SemanticAnalyzer::visitAssignmentExpression(AssignmentExpression& expr) {
    auto valueType = visitExpression(*expr.value);
    auto symbol = currentScope_->resolve(expr.name.text);
    if (!symbol) {
        reportError("Undefined variable: " + expr.name.text);
        return;
    }
    if (!symbol->isMutable) {
        reportError("Cannot assign to constant: " + expr.name.text);
    }
}

void SemanticAnalyzer::visitBinaryExpression(BinaryExpression& expr) {
    auto leftType = visitExpression(*expr.left);
    auto rightType = visitExpression(*expr.right);
    // TODO: Implement type checking for binary operations
}

void SemanticAnalyzer::visitUnaryExpression(UnaryExpression& expr) {
    auto rightType = visitExpression(*expr.right);
    // TODO: Implement type checking for unary operations
}

void SemanticAnalyzer::visitLiteralExpression(LiteralExpression& expr) {
    // TODO: Return appropriate type based on literal value
}

void SemanticAnalyzer::visitIdentifierExpression(IdentifierExpression& expr) {
    auto symbol = currentScope_->resolve(expr.name.text);
    if (!symbol) {
        reportError("Undefined variable: " + expr.name.text);
    }
}

void SemanticAnalyzer::visitIfStatement(IfStatement& stmt) {
    auto conditionType = visitExpression(*stmt.condition);
    stmt.thenBranch->accept(*this);
    if (stmt.elseBranch) {
        stmt.elseBranch->accept(*this);
    }
}

void SemanticAnalyzer::visitWhileStatement(WhileStatement& stmt) {
    auto conditionType = visitExpression(*stmt.condition);
    stmt.body->accept(*this);
}

void SemanticAnalyzer::visitBlockStatement(BlockStatement& stmt) {
    enterScope();
    for (const auto& statement : stmt.statements) {
        statement->accept(*this);
    }
    exitScope();
}

void SemanticAnalyzer::visitFunctionDeclaration(FunctionDeclaration& stmt) {
    enterScope();
    for (const auto& param : stmt.parameters) {
        // TODO: Add parameter types to symbol table
    }
    stmt.body->accept(*this);
    exitScope();
}

void SemanticAnalyzer::visitVariableDeclaration(VariableDeclaration& stmt) {
    if (stmt.initializer) {
        auto initType = visitExpression(*stmt.initializer);
        // TODO: Check type compatibility with annotation
    }
    // TODO: Add variable to symbol table with type
}

} // namespace superjs 