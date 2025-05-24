#include "semantic/SemanticAnalyzer.h"
#include <sstream>
#include <string>

namespace superjs {

// PrimitiveType implementation
std::string PrimitiveType::toString() const {
    switch (kind_) {
        case Kind::Number: return "number";
        case Kind::Boolean: return "boolean";
        case Kind::String: return "string";
        case Kind::Void: return "void";
        default: return "unknown";
    }
}

bool PrimitiveType::isAssignableFrom(const Type& other) const {
    if (const auto* otherPrimitive = dynamic_cast<const PrimitiveType*>(&other)) {
        return kind_ == otherPrimitive->kind_;
    }
    return false;
}

// SymbolTable implementation
void SymbolTable::define(const std::string& name, std::shared_ptr<Type> type, bool isMutable) {
    symbols_[name] = Symbol{name, type, isMutable, false};
}

Symbol* SymbolTable::resolve(const std::string& name) {
    auto it = symbols_.find(name);
    if (it != symbols_.end()) {
        return &it->second;
    }
    if (parent_) {
        return parent_->resolve(name);
    }
    return nullptr;
}

void SymbolTable::markInitialized(const std::string& name) {
    auto it = symbols_.find(name);
    if (it != symbols_.end()) {
        it->second.isInitialized = true;
    }
}

// SemanticAnalyzer implementation
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
    if (auto parent = currentScope_->getParent()) {
        currentScope_ = parent;
    }
}

void SemanticAnalyzer::reportError(const std::string& message) {
    errors_.push_back(message);
}

// ASTVisitor implementation
void SemanticAnalyzer::visitExpressionStatement(ExpressionStatement& stmt) {
    visitExpression(*stmt.expression);
}

void SemanticAnalyzer::visitAssignmentExpression(AssignmentExpression& expr) {
    auto valueType = visitExpression(*expr.value);
    auto symbol = currentScope_->resolve(expr.name.text);

    if (!symbol) {
        reportError("Undefined variable '" + expr.name.text + "'");
        return;
    }

    if (!symbol->isMutable) {
        reportError("Cannot assign to immutable variable '" + expr.name.text + "'");
    }

    if (!symbol->type->isAssignableFrom(*valueType)) {
        reportError("Type mismatch in assignment");
    }

    symbol->isInitialized = true;
}

void SemanticAnalyzer::visitBinaryExpression(BinaryExpression& expr) {
    auto leftType = visitExpression(*expr.left);
    auto rightType = visitExpression(*expr.right);

    switch (expr.op.kind) {
        case TokenKind::Plus:
        case TokenKind::Minus:
        case TokenKind::Star:
        case TokenKind::Slash:
            if (!leftType->isAssignableFrom(*std::make_shared<PrimitiveType>(PrimitiveType::Kind::Number)) ||
                !rightType->isAssignableFrom(*std::make_shared<PrimitiveType>(PrimitiveType::Kind::Number))) {
                reportError("Operands must be numbers");
            }
            break;

        case TokenKind::EqualEqual:
        case TokenKind::BangEqual:
        case TokenKind::Less:
        case TokenKind::LessEqual:
        case TokenKind::Greater:
        case TokenKind::GreaterEqual:
            if (!leftType->isAssignableFrom(*rightType)) {
                reportError("Operands must be of the same type");
            }
            break;

        default:
            reportError("Invalid binary operator");
    }
}

void SemanticAnalyzer::visitUnaryExpression(UnaryExpression& expr) {
    auto operandType = visitExpression(*expr.right);

    switch (expr.op.kind) {
        case TokenKind::Minus:
            if (!operandType->isAssignableFrom(*std::make_shared<PrimitiveType>(PrimitiveType::Kind::Number))) {
                reportError("Operand must be a number");
            }
            break;

        case TokenKind::Bang:
            if (!operandType->isAssignableFrom(*std::make_shared<PrimitiveType>(PrimitiveType::Kind::Boolean))) {
                reportError("Operand must be a boolean");
            }
            break;

        default:
            reportError("Invalid unary operator");
    }
}

void SemanticAnalyzer::visitLiteralExpression(LiteralExpression& expr) {
    switch (expr.value.kind) {
        case TokenKind::Number:
            break;
        case TokenKind::String:
            break;
        case TokenKind::True:
        case TokenKind::False:
            break;
        default:
            reportError("Invalid literal type");
    }
}

void SemanticAnalyzer::visitIdentifierExpression(IdentifierExpression& expr) {
    auto symbol = currentScope_->resolve(expr.name.text);
    if (!symbol) {
        reportError("Undefined variable '" + expr.name.text + "'");
    }
}

void SemanticAnalyzer::visitIfStatement(IfStatement& stmt) {
    auto conditionType = visitExpression(*stmt.condition);
    if (!conditionType->isAssignableFrom(*std::make_shared<PrimitiveType>(PrimitiveType::Kind::Boolean))) {
        reportError("If condition must be a boolean expression");
    }

    stmt.thenBranch->accept(*this);
    if (stmt.elseBranch) {
        stmt.elseBranch->accept(*this);
    }
}

void SemanticAnalyzer::visitWhileStatement(WhileStatement& stmt) {
    auto conditionType = visitExpression(*stmt.condition);
    if (!conditionType->isAssignableFrom(*std::make_shared<PrimitiveType>(PrimitiveType::Kind::Boolean))) {
        reportError("While condition must be a boolean expression");
    }

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

    // Add parameters to the scope
    for (const auto& param : stmt.parameters) {
        // For now, assume all parameters are numbers
        auto paramType = std::make_shared<PrimitiveType>(PrimitiveType::Kind::Number);
        currentScope_->define(param.text, paramType);
    }

    // Analyze the function body
    stmt.body->accept(*this);

    exitScope();
}

void SemanticAnalyzer::visitVariableDeclaration(VariableDeclaration& stmt) {
    std::shared_ptr<Type> type;
    if (stmt.initializer) {
        type = visitExpression(*stmt.initializer);
    } else {
        // For now, default to number type if no initializer
        type = std::make_shared<PrimitiveType>(PrimitiveType::Kind::Number);
    }

    currentScope_->define(stmt.name.text, type);
    if (stmt.initializer) {
        currentScope_->markInitialized(stmt.name.text);
    }
}

std::shared_ptr<Type> SemanticAnalyzer::visitExpression(Expression& expr) {
    if (auto* binary = dynamic_cast<BinaryExpression*>(&expr)) {
        visitBinaryExpression(*binary);
        return std::make_shared<PrimitiveType>(PrimitiveType::Kind::Number);
    } else if (auto* unary = dynamic_cast<UnaryExpression*>(&expr)) {
        visitUnaryExpression(*unary);
        return std::make_shared<PrimitiveType>(PrimitiveType::Kind::Number);
    } else if (auto* literal = dynamic_cast<LiteralExpression*>(&expr)) {
        visitLiteralExpression(*literal);
        switch (literal->value.kind) {
            case TokenKind::Number:
                return std::make_shared<PrimitiveType>(PrimitiveType::Kind::Number);
            case TokenKind::String:
                return std::make_shared<PrimitiveType>(PrimitiveType::Kind::String);
            case TokenKind::True:
            case TokenKind::False:
                return std::make_shared<PrimitiveType>(PrimitiveType::Kind::Boolean);
            default:
                return std::make_shared<PrimitiveType>(PrimitiveType::Kind::Void);
        }
    } else if (auto* identifier = dynamic_cast<IdentifierExpression*>(&expr)) {
        visitIdentifierExpression(*identifier);
        auto symbol = currentScope_->resolve(identifier->name.text);
        return symbol ? symbol->type : std::make_shared<PrimitiveType>(PrimitiveType::Kind::Void);
    } else if (auto* assignment = dynamic_cast<AssignmentExpression*>(&expr)) {
        visitAssignmentExpression(*assignment);
        return std::make_shared<PrimitiveType>(PrimitiveType::Kind::Void);
    }
    return std::make_shared<PrimitiveType>(PrimitiveType::Kind::Void);
}

} // namespace superjs 