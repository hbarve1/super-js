#pragma once

#include "Type.h"
#include <memory>
#include <vector>
#include <string>

namespace superjs {

class PrimitiveType : public Type {
public:
    explicit PrimitiveType(Token name) : name(name) {}

    void accept(TypeVisitor& visitor) override { visitor.visitPrimitiveType(this); }

    Token name;
};

class ArrayType : public Type {
public:
    explicit ArrayType(std::unique_ptr<Type> elementType)
        : elementType(std::move(elementType)) {}

    void accept(TypeVisitor& visitor) override { visitor.visitArrayType(this); }

    std::unique_ptr<Type> elementType;
};

class FunctionType : public Type {
public:
    FunctionType(std::vector<std::unique_ptr<Type>> paramTypes,
                std::unique_ptr<Type> returnType)
        : paramTypes(std::move(paramTypes)),
          returnType(std::move(returnType)) {}

    void accept(TypeVisitor& visitor) override { visitor.visitFunctionType(this); }

    std::vector<std::unique_ptr<Type>> paramTypes;
    std::unique_ptr<Type> returnType;
};

class ObjectType : public Type {
public:
    ObjectType(std::vector<std::pair<Token, std::unique_ptr<Type>>> properties)
        : properties(std::move(properties)) {}

    void accept(TypeVisitor& visitor) override { visitor.visitObjectType(this); }

    std::vector<std::pair<Token, std::unique_ptr<Type>>> properties;
};

class UnionType : public Type {
public:
    UnionType(std::vector<std::unique_ptr<Type>> types)
        : types(std::move(types)) {}

    void accept(TypeVisitor& visitor) override { visitor.visitUnionType(this); }

    std::vector<std::unique_ptr<Type>> types;
};

class IntersectionType : public Type {
public:
    IntersectionType(std::vector<std::unique_ptr<Type>> types)
        : types(std::move(types)) {}

    void accept(TypeVisitor& visitor) override { visitor.visitIntersectionType(this); }

    std::vector<std::unique_ptr<Type>> types;
};

class GenericType : public Type {
public:
    GenericType(Token name, std::vector<std::unique_ptr<Type>> typeArgs)
        : name(name), typeArgs(std::move(typeArgs)) {}

    void accept(TypeVisitor& visitor) override { visitor.visitGenericType(this); }

    Token name;
    std::vector<std::unique_ptr<Type>> typeArgs;
};

} // namespace superjs 