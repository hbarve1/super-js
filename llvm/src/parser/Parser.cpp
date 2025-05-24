#include "../../include/parser/Parser.h"
#include "../../include/parser/AST.h"
#include "../../include/lexer/Lexer.h"
#include <stdexcept>
#include <memory>
#include <string>
#include <vector>

namespace superjs {

std::vector<std::unique_ptr<Statement>> Parser::parse() {
    std::vector<std::unique_ptr<Statement>> statements;
    while (!isAtEnd()) {
        try {
            statements.push_back(stmtParser.parseStatement());
        } catch (const ParseError& error) {
            errors_.push_back(error.what());
            synchronize();
        }
    }
    return statements;
}

bool Parser::match(TokenKind kind) {
    if (check(kind)) {
        advance();
        return true;
    }
    return false;
}

bool Parser::check(TokenKind kind) const {
    if (isAtEnd()) return false;
    return peek().kind == kind;
}

Token Parser::advance() {
    if (!isAtEnd()) current++;
    return previous();
}

Token Parser::peek() const {
    return tokens[current];
}

Token Parser::previous() const {
    return tokens[current - 1];
}

bool Parser::isAtEnd() const {
    return peek().kind == TokenKind::EndOfFile;
}

Token Parser::consume(TokenKind kind, const std::string& message) {
    if (check(kind)) return advance();
    throw error(peek(), message);
}

ParseError Parser::error(const Token& token, const std::string& message) {
    return ParseError(token, message);
}

void Parser::synchronize() {
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