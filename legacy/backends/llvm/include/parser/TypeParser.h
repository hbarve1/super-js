#pragma once

#include "../ast/Type.h"
#include <memory>

namespace superjs {

class ParserBase;

class TypeParser {
public:
    explicit TypeParser(ParserBase& parser);
    
    std::unique_ptr<Type> parseType();
    
private:
    ParserBase& parser;
    
    std::unique_ptr<Type> parseUnionType();
    std::unique_ptr<Type> parseIntersectionType();
    std::unique_ptr<Type> parsePrimaryType();
    
    bool match(TokenKind kind);
    bool check(TokenKind kind);
    Token consume(TokenKind kind, const std::string& message);
};

} // namespace superjs 