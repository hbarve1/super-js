#include "../../include/parser/ParserBase.h"
#include <stdexcept>
#include <string>
#include <iostream>

namespace superjs {

bool ParserBase::match(TokenKind kind) {
    if (check(kind)) {
        advance();
        return true;
    }
    return false;
}

bool ParserBase::check(TokenKind kind) const {
    if (isAtEnd()) return false;
    return peek().kind == kind;
}

Token ParserBase::advance() {
    if (!isAtEnd()) {
        Token token = peek();
        current++;
        return token;
    }
    return Token(TokenKind::EndOfFile, "", 0, 0);
}

Token ParserBase::peek() const {
    if (current >= tokens.size()) {
        return Token(TokenKind::EndOfFile, "", 0, 0);
    }
    return tokens[current];
}

Token ParserBase::previous() const {
    if (current == 0) {
        return Token(TokenKind::Error, "No previous token", 0, 0);
    }
    return tokens[current - 1];
}

bool ParserBase::isAtEnd() const {
    return current >= tokens.size() || tokens[current].kind == TokenKind::EndOfFile;
}

Token ParserBase::consume(TokenKind kind, const std::string& message) {
    if (check(kind)) return advance();
    throw error(peek(), message);
}

ParseError ParserBase::error(const Token& token, const std::string& message) {
    return ParseError(token, message);
}

void ParserBase::synchronize() {
    advance();

    while (!isAtEnd()) {
        if (previous().kind == TokenKind::Semicolon) return;

        switch (peek().kind) {
            case TokenKind::Class:
            case TokenKind::Function:
            case TokenKind::Let:
            case TokenKind::Const:
            case TokenKind::For:
            case TokenKind::If:
            case TokenKind::While:
            case TokenKind::Return:
                return;
            default:
                break;
        }

        advance();
    }
}

} // namespace superjs 