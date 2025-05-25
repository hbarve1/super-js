#include "include/lexer/Lexer.h"
#include "include/parser/Parser.h"
#include "include/parser/AST.h"
#include "include/parser/ASTPrinter.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <cstdlib>
#include <memory>

int main(int argc, char* argv[]) {
    if (argc != 2) {
        std::cerr << "Usage: " << argv[0] << " <source_file>" << std::endl;
        return 1;
    }

    std::ifstream file(argv[1]);
    if (!file.is_open()) {
        std::cerr << "Error: Could not open file " << argv[1] << std::endl;
        return 1;
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string source = buffer.str();

    superjs::Lexer lexer(source);
    std::vector<superjs::Token> tokens = lexer.tokenize();

    // Print tokens in debug mode
    std::cout << "=== Tokens ===" << std::endl;
    for (const auto& token : tokens) {
        std::cout << "Token: " << token.text << " (Kind: " << static_cast<int>(token.kind) << ")" << std::endl;
    }

    // Parse the tokens into an AST
    size_t current = 0;
    superjs::Parser parser(tokens, current);
    auto program = parser.parse();

    // Print AST structure
    std::cout << "\n=== AST Structure ===" << std::endl;
    if (!program.empty()) {
        superjs::ASTPrinter printer;
        for (const auto& stmt : program) {
            if (stmt) stmt->accept(printer);
        }
    } else {
        std::cout << "Failed to parse program" << std::endl;
    }

    return 0;
} 