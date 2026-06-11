#pragma once

#include "Token.h"
#include <unordered_map>

namespace superjs {

class TokenClassifier {
public:
    TokenClassifier();
    
    // Classify tokens
    TokenKind classifyIdentifier(const std::string& text) const;
    TokenKind classifyOperator(char c, char next) const;
    TokenKind classifyPunctuation(char c) const;
    
private:
    std::unordered_map<std::string, TokenKind> keywords;
    void initializeKeywords();
};

} // namespace superjs 