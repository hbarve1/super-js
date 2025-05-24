#include "../../include/parser/Parser.h"
#include "../../include/ast/Statements.h"
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

} // namespace superjs 