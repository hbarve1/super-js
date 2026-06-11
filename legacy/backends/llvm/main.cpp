#include "include/lexer/Lexer.h"
#include "include/parser/Parser.h"
#include "include/parser/AST.h"
#include "include/parser/ASTPrinter.h"
#include "include/codegen/IRGenerator.h"
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

    std::cout << "Reading source file..." << std::endl;
    std::ifstream file(argv[1]);
    if (!file.is_open()) {
        std::cerr << "Error: Could not open file " << argv[1] << std::endl;
        return 1;
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string source = buffer.str();
    std::cout << "Source file read successfully." << std::endl;

    std::cout << "Starting lexical analysis..." << std::endl;
    superjs::Lexer lexer(source);
    std::vector<superjs::Token> tokens = lexer.tokenize();
    std::cout << "Lexical analysis completed." << std::endl;

    // Print tokens in debug mode
    std::cout << "=== Tokens ===" << std::endl;
    for (const auto& token : tokens) {
        std::cout << "Token: " << token.text << " (Kind: " << static_cast<int>(token.kind) << ")" << std::endl;
    }

    std::cout << "Starting parsing..." << std::endl;
    // Parse the tokens into an AST
    size_t current = 0;
    superjs::Parser parser(tokens, current);
    auto program = parser.parse();
    std::cout << "Parsing completed." << std::endl;

    // Print AST structure
    std::cout << "\n=== AST Structure ===" << std::endl;
    if (!program.empty()) {
        superjs::ASTPrinter printer;
        for (const auto& stmt : program) {
            if (stmt) stmt->accept(printer);
        }

        // Generate IR
        std::cout << "\n=== Generating IR ===" << std::endl;
        superjs::IRGenerator irGenerator;
        std::cout << "IRGenerator created, starting IR generation..." << std::endl;
        auto module = irGenerator.generate(program);
        std::cout << "IR generation completed." << std::endl;

        if (irGenerator.hasErrors()) {
            std::cerr << "\nErrors during IR generation:" << std::endl;
            for (const auto& error : irGenerator.getErrors()) {
                std::cerr << error << std::endl;
            }
            return 1;
        }

        // Print the generated IR
        std::cout << "\n=== Generated IR ===" << std::endl;
        module->print(llvm::errs(), nullptr);
    } else {
        std::cout << "Failed to parse program" << std::endl;
        return 1;
    }

    return 0;
} 