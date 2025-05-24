#include "lexer/Lexer.h"
#include "parser/Parser.h"
#include "ast/AST.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <cstdlib>

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

    for (const auto& token : tokens) {
        std::cout << "Token: " << token.text << " (Kind: " << static_cast<int>(token.kind) << ")" << std::endl;
    }

    return 0;
} 