#pragma once

#include "Lexer.h"
#include <string>

namespace superjs {

namespace LexerUtils {
    // String manipulation
    std::string extractText(const std::string& source, size_t start, size_t end);
    
    // Character classification
    bool isIdentifierStart(char c);
    bool isIdentifierPart(char c);
    bool isDigit(char c);
    bool isHexDigit(char c);
    bool isOctalDigit(char c);
    bool isBinaryDigit(char c);
    
    // Number parsing
    bool isValidNumber(const std::string& text);
    bool isValidHexNumber(const std::string& text);
    bool isValidOctalNumber(const std::string& text);
    bool isValidBinaryNumber(const std::string& text);
    
    // String parsing
    bool isValidString(const std::string& text);
    std::string unescapeString(const std::string& text);
};

} // namespace superjs 