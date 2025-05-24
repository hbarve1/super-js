#pragma once

#include "../../include/parser/ParserBase.h"
#include "../../include/ast/Type.h"
#include "../../include/ast/Types.h"
#include <memory>
#include <vector>
#include <string>

namespace superjs {

class TypeParser : public ParserBase {
public:
    explicit TypeParser(std::vector<Token>& tokens, size_t& current)
        : ParserBase(tokens, current) {}

    std::unique_ptr<Type> parseType();
    std::unique_ptr<Type> parsePrimitiveType();
    std::unique_ptr<Type> parseObjectType();
    std::unique_ptr<Type> parseFunctionType();
    std::unique_ptr<Type> parseGenericType();
    std::unique_ptr<Type> parseUnionType();
    std::unique_ptr<Type> parseIntersectionType();
    std::unique_ptr<Type> parseArrayType();
};

} // namespace superjs 