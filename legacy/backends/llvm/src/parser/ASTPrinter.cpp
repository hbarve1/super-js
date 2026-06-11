#include "../../include/parser/ASTPrinter.h"
#include "../../include/ast/Statements.h"
#include "../../include/ast/Expressions.h"
#include "../../include/ast/Types.h"

namespace superjs {

void ASTPrinter::printIndent() {
    for (int i = 0; i < indent_; i++) {
        out_ << "  ";
    }
}

// Statement visitor methods
void ASTPrinter::visitBlockStatement(BlockStatement* stmt) {
    printIndent();
    out_ << "BlockStatement {\n";
    indent_++;
    for (const auto& statement : stmt->statements) {
        if (statement) statement->accept(*this);
    }
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitExpressionStatement(ExpressionStatement* stmt) {
    printIndent();
    out_ << "ExpressionStatement {\n";
    indent_++;
    if (stmt->expression) stmt->expression->accept(*this);
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitIfStatement(IfStatement* stmt) {
    printIndent();
    out_ << "IfStatement {\n";
    indent_++;
    printIndent();
    out_ << "condition: ";
    if (stmt->condition) stmt->condition->accept(*this);
    printIndent();
    out_ << "thenBranch: ";
    if (stmt->thenBranch) stmt->thenBranch->accept(*this);
    if (stmt->elseBranch) {
        printIndent();
        out_ << "elseBranch: ";
        stmt->elseBranch->accept(*this);
    }
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitWhileStatement(WhileStatement* stmt) {
    printIndent();
    out_ << "WhileStatement {\n";
    indent_++;
    printIndent();
    out_ << "condition: ";
    if (stmt->condition) stmt->condition->accept(*this);
    printIndent();
    out_ << "body: ";
    if (stmt->body) stmt->body->accept(*this);
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitForStatement(ForStatement* stmt) {
    printIndent();
    out_ << "ForStatement {\n";
    indent_++;
    if (stmt->initializer) {
        printIndent();
        out_ << "initializer: ";
        stmt->initializer->accept(*this);
    }
    if (stmt->condition) {
        printIndent();
        out_ << "condition: ";
        stmt->condition->accept(*this);
    }
    if (stmt->increment) {
        printIndent();
        out_ << "increment: ";
        stmt->increment->accept(*this);
    }
    printIndent();
    out_ << "body: ";
    if (stmt->body) stmt->body->accept(*this);
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitFunctionDeclaration(FunctionDeclaration* stmt) {
    printIndent();
    out_ << "FunctionDeclaration {\n";
    indent_++;
    printIndent();
    out_ << "name: " << stmt->name.text << "\n";
    printIndent();
    out_ << "parameters: [";
    for (size_t i = 0; i < stmt->params.size(); ++i) {
        if (i > 0) out_ << ", ";
        out_ << stmt->params[i].text;
    }
    out_ << "]\n";
    printIndent();
    out_ << "body: ";
    if (stmt->body) stmt->body->accept(*this);
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitVariableDeclaration(VariableDeclaration* stmt) {
    printIndent();
    out_ << "VariableDeclaration {\n";
    indent_++;
    printIndent();
    out_ << "name: " << stmt->name.text << "\n";
    if (stmt->initializer) {
        printIndent();
        out_ << "initializer: ";
        stmt->initializer->accept(*this);
    }
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitReturnStatement(ReturnStatement* stmt) {
    printIndent();
    out_ << "ReturnStatement {\n";
    indent_++;
    if (stmt->value) {
        printIndent();
        out_ << "value: ";
        stmt->value->accept(*this);
    }
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitClassDeclaration(ClassDeclaration* stmt) {
    printIndent();
    out_ << "ClassDeclaration {\n";
    indent_++;
    printIndent();
    out_ << "name: " << stmt->name.text << "\n";
    if (stmt->superclass) {
        printIndent();
        out_ << "superclass: ";
        stmt->superclass->accept(*this);
    }
    printIndent();
    out_ << "methods: [\n";
    indent_++;
    for (const auto& method : stmt->methods) {
        if (method) method->accept(*this);
    }
    indent_--;
    printIndent();
    out_ << "]\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitBreakStatement(BreakStatement* stmt) {
    printIndent();
    out_ << "BreakStatement {\n";
    indent_++;
    printIndent();
    out_ << "keyword: " << stmt->keyword.text << "\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitContinueStatement(ContinueStatement* stmt) {
    printIndent();
    out_ << "ContinueStatement {\n";
    indent_++;
    printIndent();
    out_ << "keyword: " << stmt->keyword.text << "\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitImportStatement(ImportStatement* stmt) {
    printIndent();
    out_ << "ImportStatement {\n";
    indent_++;
    printIndent();
    out_ << "module: " << stmt->module.text << "\n";
    printIndent();
    out_ << "names: [";
    for (size_t i = 0; i < stmt->names.size(); ++i) {
        if (i > 0) out_ << ", ";
        out_ << stmt->names[i].text;
    }
    out_ << "]\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitExportStatement(ExportStatement* stmt) {
    printIndent();
    out_ << "ExportStatement {\n";
    indent_++;
    printIndent();
    out_ << "declaration: ";
    if (stmt->declaration) stmt->declaration->accept(*this);
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitTypeDeclaration(TypeDeclaration* stmt) {
    printIndent();
    out_ << "TypeDeclaration {\n";
    indent_++;
    printIndent();
    out_ << "name: " << stmt->name.text << "\n";
    printIndent();
    out_ << "type: ";
    if (stmt->type) stmt->type->accept(*this);
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitInterfaceDeclaration(InterfaceDeclaration* stmt) {
    printIndent();
    out_ << "InterfaceDeclaration {\n";
    indent_++;
    printIndent();
    out_ << "name: " << stmt->name.text << "\n";
    printIndent();
    out_ << "properties: [\n";
    indent_++;
    for (const auto& [name, type] : stmt->properties) {
        printIndent();
        out_ << name.text << ": ";
        type->accept(*this);
    }
    indent_--;
    printIndent();
    out_ << "]\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

// Expression visitor methods
void ASTPrinter::visitBinaryExpression(BinaryExpression* expr) {
    printIndent();
    out_ << "BinaryExpression {\n";
    indent_++;
    printIndent();
    out_ << "operator: " << expr->op.text << "\n";
    printIndent();
    out_ << "left: ";
    if (expr->left) expr->left->accept(*this);
    printIndent();
    out_ << "right: ";
    if (expr->right) expr->right->accept(*this);
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitUnaryExpression(UnaryExpression* expr) {
    printIndent();
    out_ << "UnaryExpression {\n";
    indent_++;
    printIndent();
    out_ << "operator: " << expr->op.text << "\n";
    printIndent();
    out_ << "right: ";
    if (expr->right) expr->right->accept(*this);
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitLiteralExpression(LiteralExpression* expr) {
    printIndent();
    out_ << "LiteralExpression {\n";
    indent_++;
    printIndent();
    out_ << "value: " << expr->value.text << "\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitIdentifierExpression(IdentifierExpression* expr) {
    printIndent();
    out_ << "IdentifierExpression {\n";
    indent_++;
    printIndent();
    out_ << "name: " << expr->name.text << "\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitVariableExpression(VariableExpression* expr) {
    printIndent();
    out_ << "VariableExpression {\n";
    indent_++;
    printIndent();
    out_ << "name: " << expr->name.text << "\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitAssignmentExpression(AssignmentExpression* expr) {
    printIndent();
    out_ << "AssignmentExpression {\n";
    indent_++;
    printIndent();
    out_ << "name: " << expr->name.text << "\n";
    printIndent();
    out_ << "value: ";
    if (expr->value) expr->value->accept(*this);
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitCallExpression(CallExpression* expr) {
    printIndent();
    out_ << "CallExpression {\n";
    indent_++;
    printIndent();
    out_ << "callee: ";
    if (expr->callee) expr->callee->accept(*this);
    printIndent();
    out_ << "arguments: [\n";
    indent_++;
    for (const auto& arg : expr->arguments) {
        if (arg) arg->accept(*this);
    }
    indent_--;
    printIndent();
    out_ << "]\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitMemberExpression(MemberExpression* expr) {
    printIndent();
    out_ << "MemberExpression {\n";
    indent_++;
    printIndent();
    out_ << "object: ";
    if (expr->object) expr->object->accept(*this);
    printIndent();
    out_ << "property: ";
    if (expr->property) expr->property->accept(*this);
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitFunctionExpression(FunctionExpression* expr) {
    printIndent();
    out_ << "FunctionExpression {\n";
    indent_++;
    printIndent();
    out_ << "parameters: [";
    for (size_t i = 0; i < expr->params.size(); ++i) {
        if (i > 0) out_ << ", ";
        out_ << expr->params[i].text;
    }
    out_ << "]\n";
    printIndent();
    out_ << "body: ";
    if (expr->body) expr->body->accept(*this);
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitClassExpression(ClassExpression* expr) {
    printIndent();
    out_ << "ClassExpression {\n";
    indent_++;
    if (expr->superclass) {
        printIndent();
        out_ << "superclass: ";
        expr->superclass->accept(*this);
    }
    printIndent();
    out_ << "methods: [\n";
    indent_++;
    for (const auto& method : expr->methods) {
        if (method) method->accept(*this);
    }
    indent_--;
    printIndent();
    out_ << "]\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitJSXExpression(JSXExpression* expr) {
    printIndent();
    out_ << "JSXExpression {\n";
    indent_++;
    printIndent();
    out_ << "tag: " << expr->tag.text << "\n";
    printIndent();
    out_ << "props: [\n";
    indent_++;
    for (const auto& [name, value] : expr->props) {
        printIndent();
        out_ << name.text << ": ";
        if (value) value->accept(*this);
    }
    indent_--;
    printIndent();
    out_ << "]\n";
    printIndent();
    out_ << "children: [\n";
    indent_++;
    for (const auto& child : expr->children) {
        if (child) child->accept(*this);
    }
    indent_--;
    printIndent();
    out_ << "]\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitGetExpression(GetExpression* expr) {
    printIndent();
    out_ << "GetExpression {\n";
    indent_++;
    printIndent();
    out_ << "object: ";
    if (expr->object) expr->object->accept(*this);
    printIndent();
    out_ << "name: " << expr->name.text << "\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitGroupingExpression(GroupingExpression* expr) {
    printIndent();
    out_ << "GroupingExpression {\n";
    indent_++;
    printIndent();
    out_ << "expression: ";
    if (expr->expression) expr->expression->accept(*this);
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitSetExpression(SetExpression* expr) {
    printIndent();
    out_ << "SetExpression {\n";
    indent_++;
    printIndent();
    out_ << "object: ";
    if (expr->object) expr->object->accept(*this);
    printIndent();
    out_ << "name: " << expr->name.text << "\n";
    printIndent();
    out_ << "value: ";
    if (expr->value) expr->value->accept(*this);
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitThisExpression(ThisExpression* expr) {
    printIndent();
    out_ << "ThisExpression {\n";
    indent_++;
    printIndent();
    out_ << "keyword: " << expr->keyword.text << "\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitSuperExpression(SuperExpression* expr) {
    printIndent();
    out_ << "SuperExpression {\n";
    indent_++;
    printIndent();
    out_ << "keyword: " << expr->keyword.text << "\n";
    printIndent();
    out_ << "method: " << expr->method.text << "\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

// Type visitor methods
void ASTPrinter::visitPrimitiveType(PrimitiveType* type) {
    printIndent();
    out_ << "PrimitiveType: " << type->name.text << "\n";
}

void ASTPrinter::visitObjectType(ObjectType* type) {
    printIndent();
    out_ << "ObjectType {\n";
    indent_++;
    for (const auto& [name, type] : type->properties) {
        printIndent();
        out_ << name.text << ": ";
        type->accept(*this);
    }
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitFunctionType(FunctionType* type) {
    printIndent();
    out_ << "FunctionType {\n";
    indent_++;
    printIndent();
    out_ << "parameters: [\n";
    indent_++;
    for (const auto& param : type->paramTypes) {
        if (param) param->accept(*this);
    }
    indent_--;
    printIndent();
    out_ << "]\n";
    printIndent();
    out_ << "returnType: ";
    if (type->returnType) type->returnType->accept(*this);
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitGenericType(GenericType* type) {
    printIndent();
    out_ << "GenericType {\n";
    indent_++;
    printIndent();
    out_ << "name: " << type->name.text << "\n";
    printIndent();
    out_ << "typeArguments: [\n";
    indent_++;
    for (const auto& arg : type->typeArgs) {
        if (arg) arg->accept(*this);
    }
    indent_--;
    printIndent();
    out_ << "]\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitUnionType(UnionType* type) {
    printIndent();
    out_ << "UnionType {\n";
    indent_++;
    printIndent();
    out_ << "types: [\n";
    indent_++;
    for (const auto& t : type->types) {
        if (t) t->accept(*this);
    }
    indent_--;
    printIndent();
    out_ << "]\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitArrayType(ArrayType* type) {
    printIndent();
    out_ << "ArrayType {\n";
    indent_++;
    printIndent();
    out_ << "elementType: ";
    if (type->elementType) type->elementType->accept(*this);
    indent_--;
    printIndent();
    out_ << "}\n";
}

void ASTPrinter::visitIntersectionType(IntersectionType* type) {
    printIndent();
    out_ << "IntersectionType {\n";
    indent_++;
    printIndent();
    out_ << "types: [\n";
    indent_++;
    for (const auto& t : type->types) {
        if (t) t->accept(*this);
    }
    indent_--;
    printIndent();
    out_ << "]\n";
    indent_--;
    printIndent();
    out_ << "}\n";
}

} // namespace superjs 