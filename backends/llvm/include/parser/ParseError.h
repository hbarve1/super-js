#pragma once

#include <stdexcept>
#include "../lexer/Token.h"

namespace superjs {

class ParseError : public std::runtime_error {
public:
    explicit ParseError(const std::string& message)
        : std::runtime_error(message) {}
    
    explicit ParseError(const Token& token, const std::string& message)
        : std::runtime_error(message + " at line " + std::to_string(token.line) + 
                           ", column " + std::to_string(token.column)) {}
};

} // namespace superjs 