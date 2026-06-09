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
    
    return makeToken(TokenKind::Number);
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
    return makeToken(TokenKind::String);
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
    return makeToken(TokenKind::String);
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
    if (current + 1 >= source.length()) return '\0';
    return source[current + 1];
}

char TokenRecognizer::advance() {
    if (isAtEnd()) return '\0';
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
    while (!isAtEnd()) {
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
            case '/':
                if (peek() == '/') {
                    // Single-line comment
                    advance(); // consume '/'
                    advance(); // consume second '/'
                    while (!isAtEnd() && currentChar() != '\n') {
                        advance();
                    }
                } else if (peek() == '*') {
                    // Multi-line comment
                    advance(); // consume '/'
                    advance(); // consume '*'
                    while (!isAtEnd()) {
                        if (currentChar() == '*' && peek() == '/') {
                            advance(); // consume '*'
                            advance(); // consume '/'
                            break;
                        }
                        if (currentChar() == '\n') {
                            line++;
                            column = 1;
                        }
                        advance();
                    }
                } else {
                    return;
                }
                break;
            default:
                return;
        }
    }
}

Token TokenRecognizer::makeToken(TokenKind kind) {
    size_t length = current - start;
    if (length > source.length() - start) {
        length = source.length() - start;
    }
    return Token(kind, source.substr(start, length), line, column);
}

Token TokenRecognizer::errorToken(const std::string& message) {
    return Token(TokenKind::Error, message, line, column);
}

} // namespace superjs 