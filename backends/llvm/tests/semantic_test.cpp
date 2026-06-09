#include <gtest/gtest.h>
#include <string>
#include <vector>
#include "lexer/Lexer.h"
#include "parser/Parser.h"
#include "parser/AST.h"
#include "semantic/SemanticAnalyzer.h"

using namespace superjs;
using namespace std;

class SemanticTest : public ::testing::Test {
protected:
    vector<Token> tokenize(const string& source) {
        Lexer lexer(source);
        return lexer.tokenize();
    }

    vector<string> analyze(const string& source) {
        auto tokens = tokenize(source);
        size_t current = 0;
        Parser parser(tokens, current);
        auto statements = parser.parse();
        
        SemanticAnalyzer analyzer;
        analyzer.analyze(statements);
        return analyzer.getErrors();
    }
};

TEST_F(SemanticTest, VariableDeclaration) {
    // Valid variable declaration
    auto errors = analyze("let x = 42;");
    EXPECT_TRUE(errors.empty());

    // Type mismatch
    errors = analyze("let x: number = \"hello\";");
    EXPECT_FALSE(errors.empty());
    EXPECT_TRUE(errors[0].find("Type mismatch") != string::npos);

    // Undefined variable
    errors = analyze("x = 42;");
    EXPECT_FALSE(errors.empty());
    EXPECT_TRUE(errors[0].find("Undefined variable") != string::npos);
}

TEST_F(SemanticTest, BinaryExpressions) {
    // Valid arithmetic
    auto errors = analyze("let x = 1 + 2 * 3;");
    EXPECT_TRUE(errors.empty());

    // Invalid arithmetic
    errors = analyze("let x = 1 + \"hello\";");
    EXPECT_FALSE(errors.empty());
    EXPECT_TRUE(errors[0].find("Operands must be numbers") != string::npos);

    // Valid comparison
    errors = analyze("let x = 1 < 2;");
    EXPECT_TRUE(errors.empty());

    // Invalid comparison
    errors = analyze("let x = 1 < \"hello\";");
    EXPECT_FALSE(errors.empty());
    EXPECT_TRUE(errors[0].find("Operands must be of the same type") != string::npos);
}

TEST_F(SemanticTest, ControlFlow) {
    // Valid if statement
    auto errors = analyze("if (true) { let x = 42; }");
    EXPECT_TRUE(errors.empty());

    // Invalid if condition
    errors = analyze("if (42) { let x = 42; }");
    EXPECT_FALSE(errors.empty());
    EXPECT_TRUE(errors[0].find("If condition must be a boolean expression") != string::npos);

    // Valid while loop
    errors = analyze("while (true) { let x = 42; }");
    EXPECT_TRUE(errors.empty());

    // Invalid while condition
    errors = analyze("while (42) { let x = 42; }");
    EXPECT_FALSE(errors.empty());
    EXPECT_TRUE(errors[0].find("While condition must be a boolean expression") != string::npos);
}

TEST_F(SemanticTest, FunctionDeclaration) {
    // Valid function declaration
    auto errors = analyze("function add(a, b) { return a + b; }");
    EXPECT_TRUE(errors.empty());

    // Invalid parameter type
    errors = analyze("function add(a: number, b: string) { return a + b; }");
    EXPECT_FALSE(errors.empty());
    EXPECT_TRUE(errors[0].find("Type mismatch") != string::npos);

    // Invalid return type
    errors = analyze("function add(a, b) { return \"hello\"; }");
    EXPECT_FALSE(errors.empty());
    EXPECT_TRUE(errors[0].find("Type mismatch") != string::npos);
}

TEST_F(SemanticTest, Scoping) {
    // Valid variable shadowing
    auto errors = analyze(R"(
        let x = 42;
        {
            let x = "hello";
        }
    )");
    EXPECT_TRUE(errors.empty());

    // Invalid variable redeclaration
    errors = analyze(R"(
        let x = 42;
        let x = "hello";
    )");
    EXPECT_FALSE(errors.empty());
    EXPECT_TRUE(errors[0].find("Variable already declared") != string::npos);

    // Valid variable access in nested scope
    errors = analyze(R"(
        let x = 42;
        {
            let y = x + 1;
        }
    )");
    EXPECT_TRUE(errors.empty());
} 