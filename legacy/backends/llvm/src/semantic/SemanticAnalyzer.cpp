#include "../../include/semantic/SemanticAnalyzer.h"
#include "../../include/ast/Statements.h"
#include "../../include/ast/Expressions.h"
#include "../../include/ast/Type.h"
#include "../../include/ast/Types.h"
#include <memory>
#include <vector>
#include <string>

namespace superjs {

void SemanticAnalyzer::analyze(const std::vector<std::unique_ptr<Statement>>& statements) {
    for (const auto& stmt : statements) {
        if (stmt) stmt->accept(*this);
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

void SemanticAnalyzer::reportError(const Token& token, const std::string& message) {
    std::string error = "Error at '" + token.text + "': " + message;
    errors_.push_back(error);
}

// Statement visitor methods
void SemanticAnalyzer::visitBlockStatement(BlockStatement* stmt) {
    enterScope();
    for (const auto& statement : stmt->statements) {
        if (statement) statement->accept(*this);
    }
    exitScope();
}

void SemanticAnalyzer::visitExpressionStatement(ExpressionStatement* stmt) {
    if (stmt->expression) stmt->expression->accept(*this);
}

void SemanticAnalyzer::visitIfStatement(IfStatement* stmt) {
    if (stmt->condition) stmt->condition->accept(*this);
    if (stmt->thenBranch) stmt->thenBranch->accept(*this);
    if (stmt->elseBranch) stmt->elseBranch->accept(*this);
}

void SemanticAnalyzer::visitWhileStatement(WhileStatement* stmt) {
    if (stmt->condition) stmt->condition->accept(*this);
    if (stmt->body) stmt->body->accept(*this);
}

void SemanticAnalyzer::visitForStatement(ForStatement* stmt) {
    if (stmt->initializer) stmt->initializer->accept(*this);
    if (stmt->condition) stmt->condition->accept(*this);
    if (stmt->increment) stmt->increment->accept(*this);
    if (stmt->body) stmt->body->accept(*this);
}

void SemanticAnalyzer::visitFunctionDeclaration(FunctionDeclaration* stmt) {
    enterScope();
    for (const auto& param : stmt->params) {
        // TODO: Add parameter types to symbol table
    }
    if (stmt->body) stmt->body->accept(*this);
    exitScope();
}

void SemanticAnalyzer::visitClassDeclaration(ClassDeclaration* stmt) {
    // TODO: Implement class declaration analysis
}

void SemanticAnalyzer::visitReturnStatement(ReturnStatement* stmt) {
    if (stmt->value) stmt->value->accept(*this);
}

void SemanticAnalyzer::visitBreakStatement(BreakStatement* stmt) {
    // TODO: Implement break statement analysis
}

void SemanticAnalyzer::visitContinueStatement(ContinueStatement* stmt) {
    // TODO: Implement continue statement analysis
}

void SemanticAnalyzer::visitVariableDeclaration(VariableDeclaration* node) {
    // If there's a type annotation, use it
    if (node->typeAnnotation) {
        // Store the variable with its annotated type
        currentScope_->define(node->name.text, node->typeAnnotation->clone(), true);
    } else if (node->initializer) {
        // Visit the initializer to determine its type
        node->initializer->accept(*this);
        
        // If the initializer is a literal, determine its type
        if (auto* literal = dynamic_cast<LiteralExpression*>(node->initializer.get())) {
            std::unique_ptr<Type> type;
            switch (literal->value.kind) {
                case TokenKind::Number:
                    type = std::make_unique<PrimitiveType>(Token(TokenKind::Number, "number", literal->value.line, literal->value.column));
                    break;
                case TokenKind::String:
                    type = std::make_unique<PrimitiveType>(Token(TokenKind::String, "string", literal->value.line, literal->value.column));
                    break;
                case TokenKind::True:
                case TokenKind::False:
                    type = std::make_unique<PrimitiveType>(Token(TokenKind::True, "boolean", literal->value.line, literal->value.column));
                    break;
                default:
                    reportError(node->name, "Invalid literal type");
                    return;
            }
            currentScope_->define(node->name.text, std::move(type), true);
        } else {
            // For non-literal expressions, use the type from the initializer
            currentScope_->define(node->name.text, std::make_unique<PrimitiveType>(Token(TokenKind::Identifier, "any", node->name.line, node->name.column)), true);
        }
    } else {
        // No type annotation or initializer, use 'any' type
        currentScope_->define(node->name.text, std::make_unique<PrimitiveType>(Token(TokenKind::Identifier, "any", node->name.line, node->name.column)), true);
    }
}

bool SemanticAnalyzer::isTypeCompatible(const Type* expected, const Type* actual) {
    if (!expected || !actual) return false;
    
    // For primitive types, check if they are the same
    if (auto* expectedPrim = dynamic_cast<const PrimitiveType*>(expected)) {
        if (auto* actualPrim = dynamic_cast<const PrimitiveType*>(actual)) {
            return expectedPrim->name.text == actualPrim->name.text;
        }
    }
    
    return false;
}

std::string SemanticAnalyzer::typeToString(const Type* type) {
    if (!type) return "unknown";
    if (auto* prim = dynamic_cast<const PrimitiveType*>(type)) {
        return prim->name.text;
    }
    return "unknown";
}

void SemanticAnalyzer::visitImportStatement(ImportStatement* stmt) {
    // TODO: Implement import statement analysis
}

void SemanticAnalyzer::visitExportStatement(ExportStatement* stmt) {
    // TODO: Implement export statement analysis
}

void SemanticAnalyzer::visitTypeDeclaration(TypeDeclaration* stmt) {
    // TODO: Implement type declaration analysis
}

void SemanticAnalyzer::visitInterfaceDeclaration(InterfaceDeclaration* stmt) {
    // TODO: Implement interface declaration analysis
}

// Expression visitor methods
void SemanticAnalyzer::visitBinaryExpression(BinaryExpression* expr) {
    if (expr->left) expr->left->accept(*this);
    if (expr->right) expr->right->accept(*this);
}

void SemanticAnalyzer::visitUnaryExpression(UnaryExpression* expr) {
    if (expr->right) expr->right->accept(*this);
}

void SemanticAnalyzer::visitLiteralExpression(LiteralExpression* expr) {
    // The type is determined by the token kind
    switch (expr->value.kind) {
        case TokenKind::Number:
            expr->type = std::make_shared<PrimitiveType>(Token(TokenKind::Number, "number", expr->value.line, expr->value.column));
            break;
        case TokenKind::String:
            expr->type = std::make_shared<PrimitiveType>(Token(TokenKind::String, "string", expr->value.line, expr->value.column));
            break;
        case TokenKind::True:
        case TokenKind::False:
            expr->type = std::make_shared<PrimitiveType>(Token(TokenKind::True, "boolean", expr->value.line, expr->value.column));
            break;
        default:
            expr->type = nullptr;
    }
}

void SemanticAnalyzer::visitVariableExpression(VariableExpression* expr) {
    // TODO: Implement variable expression analysis
}

void SemanticAnalyzer::visitAssignmentExpression(AssignmentExpression* expr) {
    if (expr->value) expr->value->accept(*this);
    auto symbol = currentScope_->resolve(expr->name.text);
    if (!symbol) {
        reportError(expr->name, "Undefined variable: " + expr->name.text);
        return;
    }
    if (symbol->isMutable == false) {
        reportError(expr->name, "Cannot assign to constant: " + expr->name.text);
        return;
    }
}

void SemanticAnalyzer::visitCallExpression(CallExpression* expr) {
    if (expr->callee) expr->callee->accept(*this);
    for (const auto& arg : expr->arguments) {
        if (arg) arg->accept(*this);
    }
}

void SemanticAnalyzer::visitGetExpression(GetExpression* expr) {
    if (expr->object) expr->object->accept(*this);
}

void SemanticAnalyzer::visitSetExpression(SetExpression* expr) {
    if (expr->object) expr->object->accept(*this);
    if (expr->value) expr->value->accept(*this);
}

void SemanticAnalyzer::visitThisExpression(ThisExpression* expr) {
    // TODO: Implement this expression analysis
}

void SemanticAnalyzer::visitSuperExpression(SuperExpression* expr) {
    // TODO: Implement super expression analysis
}

void SemanticAnalyzer::visitFunctionExpression(FunctionExpression* expr) {
    // TODO: Implement function expression analysis
}

void SemanticAnalyzer::visitClassExpression(ClassExpression* expr) {
    // TODO: Implement class expression analysis
}

void SemanticAnalyzer::visitJSXExpression(JSXExpression* expr) {
    // TODO: Implement JSX expression analysis
}

void SemanticAnalyzer::visitGroupingExpression(GroupingExpression* expr) {
    if (expr->expression) expr->expression->accept(*this);
}

void SemanticAnalyzer::visitIdentifierExpression(IdentifierExpression* expr) {
    // TODO: Implement identifier expression analysis
}

void SemanticAnalyzer::visitMemberExpression(MemberExpression* expr) {
    // TODO: Implement member expression analysis
}

// Type visitor methods
void SemanticAnalyzer::visitPrimitiveType(PrimitiveType* type) {}
void SemanticAnalyzer::visitArrayType(ArrayType* type) {}
void SemanticAnalyzer::visitFunctionType(FunctionType* type) {}
void SemanticAnalyzer::visitObjectType(ObjectType* type) {}
void SemanticAnalyzer::visitUnionType(UnionType* type) {}
void SemanticAnalyzer::visitIntersectionType(IntersectionType* type) {}
void SemanticAnalyzer::visitGenericType(GenericType* type) {}

std::shared_ptr<Type> SemanticAnalyzer::getExpressionType(Expression* expr) {
    if (!expr) return nullptr;
    
    // Visit the expression to set its type
    expr->accept(*this);
    
    // Return the type that was set during the visit
    return expr->type;
}

} // namespace superjs 