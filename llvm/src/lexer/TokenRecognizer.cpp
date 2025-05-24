#include "../../include/lexer/TokenRecognizer.h"
#include "../../include/lexer/LexerUtils.h"
#include <cctype>

namespace superjs {

TokenRecognizer::TokenRecognizer(const std::string& source)
    : source(source)
    , current(0)
    , start(0)
    , line(1)
    , column(1) {}

Token TokenRecognizer::scanIdentifier() {
    while (LexerUtils::isIdentifierPart(currentChar())) {
        advance();
    }
    return makeToken(TokenKind::Identifier);
}

Token TokenRecognizer::scanNumber() {
    while (LexerUtils::isDigit(currentChar())) {
        advance();
    }
    
    // Look for decimal point
    if (currentChar() == '.' && LexerUtils::isDigit(peek())) {
        advance(); // consume the '.'
        while (LexerUtils::isDigit(currentChar())) {
            advance();
        }
    }
    
    return makeToken(TokenKind::NumberLiteral);
}

Token TokenRecognizer::scanString() {
    char quote = currentChar();
    advance(); // consume the opening quote
    
    while (currentChar() != quote && !isAtEnd()) {
        if (currentChar() == '\n') {
            line++;
            column = 1;
        }
        advance();
    }
    
    if (isAtEnd()) {
        return errorToken("Unterminated string");
    }
    
    advance(); // consume the closing quote
    return makeToken(TokenKind::StringLiteral);
}

Token TokenRecognizer::scanTemplate() {
    advance(); // consume the opening backtick
    
    while (currentChar() != '`' && !isAtEnd()) {
        if (currentChar() == '\n') {
            line++;
            column = 1;
        }
        advance();
    }
    
    if (isAtEnd()) {
        return errorToken("Unterminated template literal");
    }
    
    advance(); // consume the closing backtick
    return makeToken(TokenKind::StringLiteral);
}

Token TokenRecognizer::scanJSX() {
    // TODO: Implement JSX scanning
    return errorToken("JSX not implemented yet");
}

// Helper methods
char TokenRecognizer::currentChar() const {
    if (isAtEnd()) return '\0';
    return source[current];
}

char TokenRecognizer::peek() const {
    if (isAtEnd()) return '\0';
    return source[current + 1];
}

char TokenRecognizer::advance() {
    char c = currentChar();
    current++;
    column++;
    return c;
}

bool TokenRecognizer::isAtEnd() const {
    return current >= source.length();
}

bool TokenRecognizer::match(char expected) {
    if (isAtEnd() || currentChar() != expected) return false;
    current++;
    column++;
    return true;
}

void TokenRecognizer::skipWhitespace() {
    while (true) {
        char c = currentChar();
        switch (c) {
            case ' ':
            case '\r':
            case '\t':
                advance();
                break;
            case '\n':
                line++;
                column = 1;
                advance();
                break;
            default:
                return;
        }
    }
}

Token TokenRecognizer::makeToken(TokenKind kind) {
    return Token(kind, source.substr(start, current - start), line, column);
}

Token TokenRecognizer::errorToken(const std::string& message) {
    return Token(TokenKind::Error, message, line, column);
}

} // namespace superjs 