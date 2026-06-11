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

    std::unique_ptr<Type> clone() const override { return std::make_unique<PrimitiveType>(name); }

    Token name;
};

class ArrayType : public Type {
public:
    explicit ArrayType(std::unique_ptr<Type> elementType)
        : elementType(std::move(elementType)) {}

    void accept(TypeVisitor& visitor) override { visitor.visitArrayType(this); }

    std::unique_ptr<Type> clone() const override {
        return std::make_unique<ArrayType>(elementType->clone());
    }

    std::unique_ptr<Type> elementType;
};

class FunctionType : public Type {
public:
    FunctionType(std::vector<std::unique_ptr<Type>> paramTypes,
                std::unique_ptr<Type> returnType)
        : paramTypes(std::move(paramTypes)),
          returnType(std::move(returnType)) {}

    void accept(TypeVisitor& visitor) override { visitor.visitFunctionType(this); }

    std::unique_ptr<Type> clone() const override {
        std::vector<std::unique_ptr<Type>> clonedParams;
        for (const auto& param : paramTypes) {
            clonedParams.push_back(param->clone());
        }
        return std::make_unique<FunctionType>(std::move(clonedParams), returnType->clone());
    }

    std::vector<std::unique_ptr<Type>> paramTypes;
    std::unique_ptr<Type> returnType;
};

class ObjectType : public Type {
public:
    ObjectType(std::vector<std::pair<Token, std::unique_ptr<Type>>> properties)
        : properties(std::move(properties)) {}

    void accept(TypeVisitor& visitor) override { visitor.visitObjectType(this); }

    std::unique_ptr<Type> clone() const override {
        std::vector<std::pair<Token, std::unique_ptr<Type>>> clonedProps;
        for (const auto& [name, type] : properties) {
            clonedProps.emplace_back(name, type->clone());
        }
        return std::make_unique<ObjectType>(std::move(clonedProps));
    }

    std::vector<std::pair<Token, std::unique_ptr<Type>>> properties;
};

class UnionType : public Type {
public:
    UnionType(std::vector<std::unique_ptr<Type>> types)
        : types(std::move(types)) {}

    void accept(TypeVisitor& visitor) override { visitor.visitUnionType(this); }

    std::unique_ptr<Type> clone() const override {
        std::vector<std::unique_ptr<Type>> clonedTypes;
        for (const auto& type : types) {
            clonedTypes.push_back(type->clone());
        }
        return std::make_unique<UnionType>(std::move(clonedTypes));
    }

    std::vector<std::unique_ptr<Type>> types;
};

class IntersectionType : public Type {
public:
    IntersectionType(std::vector<std::unique_ptr<Type>> types)
        : types(std::move(types)) {}

    void accept(TypeVisitor& visitor) override { visitor.visitIntersectionType(this); }

    std::unique_ptr<Type> clone() const override {
        std::vector<std::unique_ptr<Type>> clonedTypes;
        for (const auto& type : types) {
            clonedTypes.push_back(type->clone());
        }
        return std::make_unique<IntersectionType>(std::move(clonedTypes));
    }

    std::vector<std::unique_ptr<Type>> types;
};

class GenericType : public Type {
public:
    GenericType(Token name, std::vector<std::unique_ptr<Type>> typeArgs)
        : name(name), typeArgs(std::move(typeArgs)) {}

    void accept(TypeVisitor& visitor) override { visitor.visitGenericType(this); }

    std::unique_ptr<Type> clone() const override {
        std::vector<std::unique_ptr<Type>> clonedArgs;
        for (const auto& arg : typeArgs) {
            clonedArgs.push_back(arg->clone());
        }
        return std::make_unique<GenericType>(name, std::move(clonedArgs));
    }

    Token name;
    std::vector<std::unique_ptr<Type>> typeArgs;
};

} // namespace superjs 