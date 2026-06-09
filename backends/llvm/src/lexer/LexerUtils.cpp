#include "../../include/lexer/LexerUtils.h"
#include <cctype>

namespace superjs {

namespace LexerUtils {

std::string extractText(const std::string& source, size_t start, size_t end) {
    return source.substr(start, end - start);
}

bool isIdentifierStart(char c) {
    return std::isalpha(c) || c == '_';
}

bool isIdentifierPart(char c) {
    return std::isalnum(c) || c == '_';
}

bool isDigit(char c) {
    return std::isdigit(c);
}

bool isHexDigit(char c) {
    return std::isxdigit(c);
}

bool isOctalDigit(char c) {
    return c >= '0' && c <= '7';
}

bool isBinaryDigit(char c) {
    return c == '0' || c == '1';
}

bool isValidNumber(const std::string& text) {
    if (text.empty()) return false;
    
    size_t i = 0;
    if (text[i] == '-') i++;
    
    bool hasDigit = false;
    while (i < text.length() && isDigit(text[i])) {
        hasDigit = true;
        i++;
    }
    
    if (!hasDigit) return false;
    
    if (i < text.length() && text[i] == '.') {
        i++;
        bool hasDecimalDigit = false;
        while (i < text.length() && isDigit(text[i])) {
            hasDecimalDigit = true;
            i++;
        }
        if (!hasDecimalDigit) return false;
    }
    
    if (i < text.length() && (text[i] == 'e' || text[i] == 'E')) {
        i++;
        if (i < text.length() && (text[i] == '+' || text[i] == '-')) {
            i++;
        }
        bool hasExponentDigit = false;
        while (i < text.length() && isDigit(text[i])) {
            hasExponentDigit = true;
            i++;
        }
        if (!hasExponentDigit) return false;
    }
    
    return i == text.length();
}

bool isValidHexNumber(const std::string& text) {
    if (text.length() < 3) return false;
    if (text[0] != '0' || (text[1] != 'x' && text[1] != 'X')) return false;
    
    for (size_t i = 2; i < text.length(); i++) {
        if (!isHexDigit(text[i])) return false;
    }
    return true;
}

bool isValidOctalNumber(const std::string& text) {
    if (text.length() < 2) return false;
    if (text[0] != '0') return false;
    
    for (size_t i = 1; i < text.length(); i++) {
        if (!isOctalDigit(text[i])) return false;
    }
    return true;
}

bool isValidBinaryNumber(const std::string& text) {
    if (text.length() < 3) return false;
    if (text[0] != '0' || (text[1] != 'b' && text[1] != 'B')) return false;
    
    for (size_t i = 2; i < text.length(); i++) {
        if (!isBinaryDigit(text[i])) return false;
    }
    return true;
}

bool isValidString(const std::string& text) {
    if (text.length() < 2) return false;
    if (text[0] != '"' && text[0] != '\'') return false;
    if (text[text.length() - 1] != text[0]) return false;
    
    for (size_t i = 1; i < text.length() - 1; i++) {
        if (text[i] == '\\') {
            if (i + 1 >= text.length() - 1) return false;
            i++; // Skip the escape character
        }
    }
    return true;
}

std::string unescapeString(const std::string& text) {
    std::string result;
    result.reserve(text.length());
    
    for (size_t i = 1; i < text.length() - 1; i++) {
        if (text[i] == '\\') {
            if (i + 1 >= text.length() - 1) break;
            i++; // Skip the escape character
            
            switch (text[i]) {
                case 'n': result += '\n'; break;
                case 'r': result += '\r'; break;
                case 't': result += '\t'; break;
                case '\\': result += '\\'; break;
                case '"': result += '"'; break;
                case '\'': result += '\''; break;
                default: result += text[i]; break;
            }
        } else {
            result += text[i];
        }
    }
    
    return result;
}

} // namespace LexerUtils

} // namespace superjs 