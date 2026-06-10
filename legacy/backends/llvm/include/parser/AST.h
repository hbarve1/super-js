#pragma once

#include <string>
#include <vector>
#include <memory>
#include "../lexer/Lexer.h"

namespace superjs {

// Forward declarations
class ASTVisitor;
class Expression;
class Statement;
class BinaryExpression;
class UnaryExpression;
class LiteralExpression;
class IdentifierExpression;
class IfStatement;
class WhileStatement;
class ForStatement;
class BlockStatement;
class FunctionDeclaration;
class VariableDeclaration;
class ExpressionStatement;
class AssignmentExpression;
class ReturnStatement;
class ClassDeclaration;
class ImportStatement;
class ExportStatement;
class TypeDeclaration;
class InterfaceDeclaration;

// Forward declarations for expressions
class VariableExpression;
class CallExpression;
class MemberExpression;
class FunctionExpression;
class ClassExpression;
class JSXExpression;

// Forward declarations for types
class Type;
class PrimitiveType;
class ObjectType;
class FunctionType;
class GenericType;
class UnionType;

// Base class for all AST nodes
class Node {
public:
    virtual ~Node() = default;
    virtual void accept(ASTVisitor& visitor) = 0;
};

} // namespace superjs 