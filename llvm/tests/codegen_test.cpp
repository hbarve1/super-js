#include <gtest/gtest.h>
#include "codegen/IRGenerator.h"
#include "parser/Parser.h"
#include "lexer/Lexer.h"
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>
#include <llvm/Support/raw_ostream.h>
#include <sstream>

using namespace superjs;

TEST(CodeGenTest, SimpleArithmetic) {
    // Create a simple arithmetic expression: 2 + 3 * 4
    std::string input = "2 + 3 * 4;";
    Lexer lexer(input);
    auto tokens = lexer.tokenize();
    size_t current = 0;
    Parser parser(tokens, current);
    
    auto statements = parser.parse();
    ASSERT_FALSE(parser.hasErrors()) << "Parser errors: " << parser.getErrors()[0];
    
    IRGenerator generator;
    auto module = generator.generate(statements);
    ASSERT_FALSE(generator.hasErrors()) << "IR generation errors: " << generator.getErrors()[0];
    
    // Print the generated IR
    std::string ir;
    llvm::raw_string_ostream irStream(ir);
    module->print(irStream, nullptr);
    
    // Verify the IR contains the expected operations
    EXPECT_TRUE(ir.find("add") != std::string::npos);
    EXPECT_TRUE(ir.find("mul") != std::string::npos);
    EXPECT_TRUE(ir.find("2.000000e+00") != std::string::npos);
    EXPECT_TRUE(ir.find("3.000000e+00") != std::string::npos);
    EXPECT_TRUE(ir.find("4.000000e+00") != std::string::npos);
}

TEST(CodeGenTest, FunctionDefinition) {
    // Create a simple function: function add(a, b) { return a + b; }
    std::string input = "function add(a: number, b: number): number { return a + b; }";
    Lexer lexer(input);
    auto tokens = lexer.tokenize();
    size_t current = 0;
    Parser parser(tokens, current);
    
    auto statements = parser.parse();
    ASSERT_FALSE(parser.hasErrors()) << "Parser errors: " << parser.getErrors()[0];
    
    IRGenerator generator;
    auto module = generator.generate(statements);
    ASSERT_FALSE(generator.hasErrors()) << "IR generation errors: " << generator.getErrors()[0];
    
    // Print the generated IR
    std::string ir;
    llvm::raw_string_ostream irStream(ir);
    module->print(irStream, nullptr);
    
    // Verify the IR contains the function definition
    EXPECT_TRUE(ir.find("define") != std::string::npos);
    EXPECT_TRUE(ir.find("add") != std::string::npos);
    EXPECT_TRUE(ir.find("double") != std::string::npos);
} 