#pragma once

#include "../lexer/Token.h"
#include <memory>
#include <vector>
#include <string>

namespace superjs {

class Type {
public:
    virtual ~Type() = default;
    virtual void accept(class TypeVisitor& visitor) = 0;
    virtual std::unique_ptr<Type> clone() const = 0;
};

class TypeVisitor {
public:
    virtual ~TypeVisitor() = default;
    virtual void visitPrimitiveType(class PrimitiveType* type) = 0;
    virtual void visitArrayType(class ArrayType* type) = 0;
    virtual void visitFunctionType(class FunctionType* type) = 0;
    virtual void visitObjectType(class ObjectType* type) = 0;
    virtual void visitUnionType(class UnionType* type) = 0;
    virtual void visitIntersectionType(class IntersectionType* type) = 0;
    virtual void visitGenericType(class GenericType* type) = 0;
};

} // namespace superjs 