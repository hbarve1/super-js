#include <iostream>
#include <string>
#include <vector>
#include <filesystem>
#include <fstream>
#include <sstream>
#include "lexer/Lexer.h"
#include "parser/Parser.h"
#include "semantic/SemanticAnalyzer.h"
#include "codegen/IRGenerator.h"

using namespace superjs;

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " <input-file>" << std::endl;
        return 1;
    }

    std::string inputFile = argv[1];
    if (!std::filesystem::exists(inputFile)) {
        std::cerr << "Error: File '" << inputFile << "' does not exist." << std::endl;
        return 1;
    }

    // Read input file
    std::ifstream file(inputFile);
    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string source = buffer.str();

    // Lexical analysis
    Lexer lexer(source);
    std::vector<Token> tokens = lexer.tokenize();

    // Print tokens
    std::cout << "=== Tokens ===" << std::endl;
    for (const auto& token : tokens) {
        std::cout << "Token: " << token.lexeme << " (Kind: " << static_cast<int>(token.kind) << ")" << std::endl;
    }

    // Parsing
    Parser parser(tokens);
    auto statements = parser.parse();

    // Print AST
    std::cout << "\n=== AST Structure ===" << std::endl;
    for (const auto& stmt : statements) {
        stmt->print();
    }

    // Semantic analysis
    SemanticAnalyzer analyzer;
    analyzer.analyze(statements);

    // IR Generation
    IRGenerator generator;
    auto module = generator.generate(statements);

    if (!module) {
        std::cerr << "Error: Failed to generate IR" << std::endl;
        return 1;
    }

    return 0;
} 