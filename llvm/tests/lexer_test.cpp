#include "lexer/Lexer.h"
#include <gtest/gtest.h>
#include <string>
#include <vector>

using namespace superjs;

TEST(LexerTest, BasicTokens) {
    std::string source = "let x = 42;";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    ASSERT_EQ(tokens.size(), 5);
    EXPECT_EQ(tokens[0].kind, TokenKind::Let);
    EXPECT_EQ(tokens[1].kind, TokenKind::Identifier);
    EXPECT_EQ(tokens[2].kind, TokenKind::Equal);
    EXPECT_EQ(tokens[3].kind, TokenKind::Number);
    EXPECT_EQ(tokens[4].kind, TokenKind::Semicolon);
}

TEST(LexerTest, StringLiterals) {
    std::string source = "\"hello\" 'world'";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    ASSERT_EQ(tokens.size(), 3);
    EXPECT_EQ(tokens[0].kind, TokenKind::String);
    EXPECT_EQ(tokens[0].text, "\"hello\"");
    EXPECT_EQ(tokens[1].kind, TokenKind::String);
    EXPECT_EQ(tokens[1].text, "'world'");
}

TEST(LexerTest, Numbers) {
    std::string source = "42 3.14 0.5";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    ASSERT_EQ(tokens.size(), 4);
    EXPECT_EQ(tokens[0].kind, TokenKind::Number);
    EXPECT_EQ(tokens[0].text, "42");
    EXPECT_EQ(tokens[1].kind, TokenKind::Number);
    EXPECT_EQ(tokens[1].text, "3.14");
    EXPECT_EQ(tokens[2].kind, TokenKind::Number);
    EXPECT_EQ(tokens[2].text, "0.5");
}

TEST(LexerTest, Operators) {
    std::string source = "+ - * / % = == != < <= > >= && || !";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    ASSERT_EQ(tokens.size(), 16);
    EXPECT_EQ(tokens[0].kind, TokenKind::Plus);
    EXPECT_EQ(tokens[1].kind, TokenKind::Minus);
    EXPECT_EQ(tokens[2].kind, TokenKind::Star);
    EXPECT_EQ(tokens[3].kind, TokenKind::Slash);
    EXPECT_EQ(tokens[4].kind, TokenKind::Percent);
    EXPECT_EQ(tokens[5].kind, TokenKind::Equal);
    EXPECT_EQ(tokens[6].kind, TokenKind::EqualEqual);
    EXPECT_EQ(tokens[7].kind, TokenKind::BangEqual);
    EXPECT_EQ(tokens[8].kind, TokenKind::Less);
    EXPECT_EQ(tokens[9].kind, TokenKind::LessEqual);
    EXPECT_EQ(tokens[10].kind, TokenKind::Greater);
    EXPECT_EQ(tokens[11].kind, TokenKind::GreaterEqual);
    EXPECT_EQ(tokens[12].kind, TokenKind::And);
    EXPECT_EQ(tokens[13].kind, TokenKind::Or);
    EXPECT_EQ(tokens[14].kind, TokenKind::Bang);
}

TEST(LexerTest, Comments) {
    std::string source = "// Single line comment\n/* Multi\nline\ncomment */";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    ASSERT_EQ(tokens.size(), 1);
    EXPECT_EQ(tokens[0].kind, TokenKind::EndOfFile);
}

TEST(LexerTest, Keywords) {
    std::string source = "let const var function return if else while for";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    ASSERT_EQ(tokens.size(), 10);
    EXPECT_EQ(tokens[0].kind, TokenKind::Let);
    EXPECT_EQ(tokens[1].kind, TokenKind::Const);
    EXPECT_EQ(tokens[2].kind, TokenKind::Var);
    EXPECT_EQ(tokens[3].kind, TokenKind::Function);
    EXPECT_EQ(tokens[4].kind, TokenKind::Return);
    EXPECT_EQ(tokens[5].kind, TokenKind::If);
    EXPECT_EQ(tokens[6].kind, TokenKind::Else);
    EXPECT_EQ(tokens[7].kind, TokenKind::While);
    EXPECT_EQ(tokens[8].kind, TokenKind::For);
}

TEST(LexerTest, Identifiers) {
    std::string source = "x _y z123 _123";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    ASSERT_EQ(tokens.size(), 5);
    EXPECT_EQ(tokens[0].kind, TokenKind::Identifier);
    EXPECT_EQ(tokens[0].text, "x");
    EXPECT_EQ(tokens[1].kind, TokenKind::Identifier);
    EXPECT_EQ(tokens[1].text, "_y");
    EXPECT_EQ(tokens[2].kind, TokenKind::Identifier);
    EXPECT_EQ(tokens[2].text, "z123");
    EXPECT_EQ(tokens[3].kind, TokenKind::Identifier);
    EXPECT_EQ(tokens[3].text, "_123");
}

TEST(LexerTest, ErrorHandling) {
    std::string source = "\"unterminated string";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    ASSERT_EQ(tokens.size(), 2);
    EXPECT_EQ(tokens[0].kind, TokenKind::Error);
    EXPECT_EQ(tokens[0].text, "Unterminated string");
}

int main(int argc, char** argv) {
    testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
} 