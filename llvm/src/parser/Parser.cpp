#include "../../include/parser/Parser.h"
#include "../../include/ast/Statements.h"
#include "../../include/lexer/Lexer.h"
#include <stdexcept>
#include <memory>
#include <string>
#include <vector>
#include <iostream>

namespace superjs {

std::vector<std::unique_ptr<Statement>> Parser::parse() {
    std::vector<std::unique_ptr<Statement>> statements;
    while (!isAtEnd()) {
        try {
            std::cerr << "Parsing statement at token: " << peek().text << std::endl;
            auto stmt = statement_parser_.parseStatement();
            if (stmt) {
                statements.push_back(std::move(stmt));
            } else {
                errors_.push_back("Failed to parse statement.");
                synchronize();
            }
        } catch (const ParseError& error) {
            errors_.push_back(error.what());
            synchronize();
        } catch (const std::exception& e) {
            errors_.push_back(std::string("Unexpected error: ") + e.what());
            synchronize();
        }
    }
    return statements;
}

} // namespace superjs 