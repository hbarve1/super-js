#pragma once

#include <memory>
#include <vector>
#include <string>
#include "../lexer/Token.h"
#include "AST.h"
#include "ParseError.h"
#include "ExpressionParser.h"

namespace superjs {

// Forward declarations
class Statement;
class Expression;

class StatementParser {
public:
    explicit StatementParser(std::vector<Token>& tokens, size_t& current, ExpressionParser& exprParser)
        : tokens(tokens), current(current), exprParser(exprParser) {}

    std::unique_ptr<Statement> parseStatement();
    std::unique_ptr<Statement> parseIfStatement();
    std::unique_ptr<Statement> parseWhileStatement();
    std::unique_ptr<Statement> parseForStatement();
    std::unique_ptr<Statement> parseBlockStatement();
    std::unique_ptr<Statement> parseFunctionDeclaration();
    std::unique_ptr<Statement> parseVariableDeclaration();
    std::unique_ptr<Statement> parseExpressionStatement();
    std::unique_ptr<Statement> parseReturnStatement();
    std::unique_ptr<Statement> parseClassDeclaration();
    std::unique_ptr<Statement> parseImportStatement();
    std::unique_ptr<Statement> parseExportStatement();
    std::unique_ptr<Statement> parseTypeDeclaration();
    std::unique_ptr<Statement> parseInterfaceDeclaration();

private:
    std::vector<Token>& tokens;
    size_t& current;
    ExpressionParser& exprParser;

    // Helper methods
    bool match(TokenKind kind);
    bool check(TokenKind kind) const;
    Token advance();
    Token peek() const;
    Token previous() const;
    bool isAtEnd() const;
    Token consume(TokenKind kind, const std::string& message);
    ParseError error(const Token& token, const std::string& message);
    void synchronize();
};

} // namespace superjs 