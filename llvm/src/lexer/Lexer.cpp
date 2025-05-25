#include "../../include/lexer/Lexer.h"
#include "../../include/lexer/TokenRecognizer.h"
#include "../../include/lexer/TokenClassifier.h"
#include "../../include/lexer/LexerUtils.h"
#include <cctype>
#include <iostream>

namespace superjs {

Lexer::Lexer(const std::string& source)
    : source(source)
    , line(1)
    , column(1)
    , recognizer(std::make_unique<TokenRecognizer>(source))
    , classifier(std::make_unique<TokenClassifier>()) {
}

Token Lexer::nextToken() {
    recognizer->skipWhitespace();
    
    // Reset start to current for each new token
    recognizer->setStart(recognizer->getCurrent());
    line = recognizer->getLine();
    column = recognizer->getColumn();
    
    if (recognizer->isAtEnd()) {
        return Token(TokenKind::EndOfFile, "", line, column);
    }
    
    char c = recognizer->currentChar();
    
    // Handle identifiers and keywords
    if (LexerUtils::isIdentifierStart(c)) {
        Token token = recognizer->scanIdentifier();
        token.kind = classifier->classifyIdentifier(token.text);
        return token;
    }
    
    // Handle numbers
    if (LexerUtils::isDigit(c)) {
        return recognizer->scanNumber();
    }
    
    // Handle strings
    if (c == '"' || c == '\'') {
        return recognizer->scanString();
    }
    
    // Handle template literals
    if (c == '`') {
        return recognizer->scanTemplate();
    }
    
    // Handle operators and punctuation
    char next = recognizer->peek();
    TokenKind operatorKind = classifier->classifyOperator(c, next);
    if (operatorKind != TokenKind::Error) {
        if (operatorKind == TokenKind::PlusPlus || operatorKind == TokenKind::MinusMinus ||
            operatorKind == TokenKind::PlusEqual || operatorKind == TokenKind::MinusEqual ||
            operatorKind == TokenKind::StarEqual || operatorKind == TokenKind::SlashEqual ||
            operatorKind == TokenKind::EqualEqual || operatorKind == TokenKind::BangEqual ||
            operatorKind == TokenKind::LessEqual || operatorKind == TokenKind::GreaterEqual ||
            operatorKind == TokenKind::And || operatorKind == TokenKind::Or) {
            recognizer->advance(); // consume the second character
            recognizer->advance(); // consume the first character
            return Token(operatorKind, source.substr(recognizer->getStart(), 2), line, column);
        }
        recognizer->advance(); // consume the operator
        return Token(operatorKind, std::string(1, c), line, column);
    }
    
    // Handle punctuation
    TokenKind punctKind = classifier->classifyPunctuation(c);
    if (punctKind != TokenKind::Error) {
        recognizer->advance();
        return Token(punctKind, std::string(1, c), line, column);
    }
    
    return Token(TokenKind::Error, "Unexpected character", line, column);
}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;
    Token token;
    do {
        token = nextToken();
        std::cerr << "Token: " << token.text << " (Kind: " << static_cast<int>(token.kind) << ")" << std::endl;
        tokens.push_back(token);
        if (token.kind == TokenKind::Error) {
            tokens.push_back(Token(TokenKind::EndOfFile, "", line, column));
            break;
        }
    } while (token.kind != TokenKind::EndOfFile);

    return tokens;
}

} // namespace superjs 