#include <gtest/gtest.h>
#include "lexer/Lexer.h"
#include "parser/Parser.h"

using namespace superjs;

class ParserTest : public ::testing::Test {
protected:
    std::vector<Token> tokenize(const std::string& source) {
        Lexer lexer(source);
        return lexer.tokenize();
    }
};

TEST_F(ParserTest, BasicExpressions) {
    std::string source = "1 + 2 * 3;";
    auto tokens = tokenize(source);
    Parser parser(tokens);
    auto statements = parser.parse();
    ASSERT_EQ(statements.size(), 1);
}

TEST_F(ParserTest, IfStatement) {
    std::string source = "if (x > 0) { return x; } else { return -x; }";
    auto tokens = tokenize(source);
    Parser parser(tokens);
    auto statements = parser.parse();
    ASSERT_EQ(statements.size(), 1);
}

TEST_F(ParserTest, WhileStatement) {
    std::string source = "while (x > 0) { x = x - 1; }";
    auto tokens = tokenize(source);
    Parser parser(tokens);
    auto statements = parser.parse();
    ASSERT_EQ(statements.size(), 1);
}

TEST_F(ParserTest, FunctionDeclaration) {
    std::string source = "function add(a, b) { return a + b; }";
    auto tokens = tokenize(source);
    Parser parser(tokens);
    auto statements = parser.parse();
    ASSERT_EQ(statements.size(), 1);
}

TEST_F(ParserTest, VariableDeclaration) {
    std::string source = "let x = 42;";
    auto tokens = tokenize(source);
    Parser parser(tokens);
    auto statements = parser.parse();
    ASSERT_EQ(statements.size(), 1);
}

TEST_F(ParserTest, BlockStatement) {
    std::string source = "{ let x = 1; let y = 2; x + y; }";
    auto tokens = tokenize(source);
    Parser parser(tokens);
    auto statements = parser.parse();
    ASSERT_EQ(statements.size(), 1);
}

TEST_F(ParserTest, OperatorPrecedence) {
    std::string source = "1 + 2 * 3 - 4 / 2;";
    auto tokens = tokenize(source);
    Parser parser(tokens);
    auto statements = parser.parse();
    ASSERT_EQ(statements.size(), 1);
}

TEST_F(ParserTest, UnaryOperators) {
    std::string source = "-x; !y;";
    auto tokens = tokenize(source);
    Parser parser(tokens);
    auto statements = parser.parse();
    ASSERT_EQ(statements.size(), 2);
}

TEST_F(ParserTest, ComparisonOperators) {
    std::string source = "x < y; x <= y; x > y; x >= y; x == y; x != y;";
    auto tokens = tokenize(source);
    Parser parser(tokens);
    auto statements = parser.parse();
    ASSERT_EQ(statements.size(), 6);
}

TEST_F(ParserTest, Assignment) {
    std::string source = "x = 42; y = x + 1;";
    auto tokens = tokenize(source);
    Parser parser(tokens);
    auto statements = parser.parse();
    ASSERT_EQ(statements.size(), 2);
} 