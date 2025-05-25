#pragma once

#include <memory>
#include <vector>
#include <string>
#include "../lexer/Token.h"
#include "ParserBase.h"
#include "ExpressionParser.h"
#include "StatementParser.h"
#include "TypeParser.h"
#include "ParseError.h"

namespace superjs {

// Forward declarations
class Statement;

class Parser : public ParserBase {
public:
    Parser(std::vector<Token>& tokens, size_t& current)
        : ParserBase(tokens, current),
          expression_parser_(tokens, current),
          type_parser_(tokens, current),
          statement_parser_(tokens, current) {}

    std::vector<std::unique_ptr<Statement>> parse();

    // Error handling
    bool hasErrors() const { return !errors_.empty(); }
    const std::vector<std::string>& getErrors() const { return errors_; }

private:
    ExpressionParser expression_parser_;
    TypeParser type_parser_;
    StatementParser statement_parser_;
    std::vector<std::string> errors_;
};

} // namespace superjs 