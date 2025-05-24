#pragma once

#include <memory>
#include <vector>
#include <string>
#include "../lexer/Token.h"
#include "ParserBase.h"
#include "AST.h"
#include "ExpressionParser.h"
#include "StatementParser.h"
#include "TypeParser.h"
#include "ParseError.h"

namespace superjs {

// Forward declarations
class Statement;

class Parser : public ParserBase {
public:
    explicit Parser(std::vector<Token> tokens)
        : ParserBase(tokens, current),
          current(0),
          exprParser(tokens, current),
          typeParser(tokens, current),
          stmtParser(tokens, current, exprParser, typeParser) {}

    std::vector<std::unique_ptr<Statement>> parse();

    // Error handling
    bool hasErrors() const { return !errors_.empty(); }
    const std::vector<std::string>& getErrors() const { return errors_; }

private:
    size_t current;
    ExpressionParser exprParser;
    TypeParser typeParser;
    StatementParser stmtParser;

    // Member variables
    std::vector<std::string> errors_;
};

} // namespace superjs 