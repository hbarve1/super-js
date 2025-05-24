#pragma once

#include "ParserBase.h"
#include "ExpressionParser.h"
#include "TypeParser.h"
#include "../ast/Statements.h"
#include "../ast/Expressions.h"
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
};

} // namespace superjs 