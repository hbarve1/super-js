#pragma once

#include "../../include/parser/ParserBase.h"
#include "../../include/parser/ExpressionParser.h"
#include "../../include/parser/TypeParser.h"
#include "../../include/ast/Statements.h"
#include "../../include/ast/Expressions.h"
#include "../../include/lexer/Token.h"
#include <memory>
#include <vector>

namespace superjs {

class StatementParser : public ParserBase {
public:
    StatementParser(std::vector<Token>& tokens, size_t& current, ExpressionParser& exprParser, TypeParser& typeParser)
        : ParserBase(tokens, current), exprParser(exprParser), typeParser(typeParser) {}

    std::unique_ptr<Statement> parseStatement();
    std::unique_ptr<Statement> parseBlockStatement();
    std::unique_ptr<Statement> parseIfStatement();
    std::unique_ptr<Statement> parseWhileStatement();
    std::unique_ptr<Statement> parseForStatement();
    std::unique_ptr<Statement> parseFunctionDeclaration();
    std::unique_ptr<Statement> parseClassDeclaration();
    std::unique_ptr<Statement> parseReturnStatement();
    std::unique_ptr<Statement> parseBreakStatement();
    std::unique_ptr<Statement> parseContinueStatement();
    std::unique_ptr<Statement> parseVariableDeclaration();
    std::unique_ptr<Statement> parseImportStatement();
    std::unique_ptr<Statement> parseExportStatement();
    std::unique_ptr<Statement> parseTypeDeclaration();
    std::unique_ptr<Statement> parseInterfaceDeclaration();

private:
    ExpressionParser& exprParser;
    TypeParser& typeParser;

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