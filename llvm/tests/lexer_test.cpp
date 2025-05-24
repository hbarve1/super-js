#include "lexer/Lexer.h"
#include <gtest/gtest.h>
#include <string>
#include <vector>
#include <iostream>
#include <fstream>

using namespace superjs;

TEST(LexerTest, BasicTokens) {
    std::string source = "let x = 42;";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    ASSERT_EQ(tokens.size(), 6);  // 5 tokens + EOF
    EXPECT_EQ(tokens[0].kind, TokenKind::Let);
    EXPECT_EQ(tokens[1].kind, TokenKind::Identifier);
    EXPECT_EQ(tokens[2].kind, TokenKind::Equal);
    EXPECT_EQ(tokens[3].kind, TokenKind::Number);
    EXPECT_EQ(tokens[4].kind, TokenKind::Semicolon);
    EXPECT_EQ(tokens[5].kind, TokenKind::EndOfFile);
}

TEST(LexerTest, StringLiterals) {
    std::string source = "\"hello\" 'world'";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    ASSERT_EQ(tokens.size(), 3);  // 2 tokens + EOF
    EXPECT_EQ(tokens[0].kind, TokenKind::String);
    EXPECT_EQ(tokens[0].text, "\"hello\"");
    EXPECT_EQ(tokens[1].kind, TokenKind::String);
    EXPECT_EQ(tokens[1].text, "'world'");
    EXPECT_EQ(tokens[2].kind, TokenKind::EndOfFile);
}

TEST(LexerTest, Numbers) {
    std::string source = "42 3.14 0.5";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    ASSERT_EQ(tokens.size(), 4);  // 3 tokens + EOF
    EXPECT_EQ(tokens[0].kind, TokenKind::Number);
    EXPECT_EQ(tokens[0].text, "42");
    EXPECT_EQ(tokens[1].kind, TokenKind::Number);
    EXPECT_EQ(tokens[1].text, "3.14");
    EXPECT_EQ(tokens[2].kind, TokenKind::Number);
    EXPECT_EQ(tokens[2].text, "0.5");
    EXPECT_EQ(tokens[3].kind, TokenKind::EndOfFile);
}

TEST(LexerTest, Operators) {
    std::string source = "+ - * / % = == != < <= > >= && || !";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    // Debug output to file
    std::ofstream debug_file("lexer_debug.txt");
    debug_file << "\nActual tokens:" << std::endl;
    for (size_t i = 0; i < tokens.size(); ++i) {
        debug_file << "Token " << i << ": " << tokens[i].text << std::endl;
    }
    debug_file.close();
    
    ASSERT_EQ(tokens.size(), 16);  // 15 tokens + EOF
    const char* expected_texts[] = {
        "+", "-", "*", "/", "%", "=", "==", "!=", "<", "<=", ">", ">=", "&&", "||", "!"
    };
    for (int i = 0; i < 15; ++i) {
        EXPECT_EQ(tokens[i].text, expected_texts[i]);
    }
    EXPECT_EQ(tokens[15].kind, TokenKind::EndOfFile);
}

TEST(LexerTest, Comments) {
    std::string source = "// Single line comment\n/* Multi\nline\ncomment */";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    ASSERT_EQ(tokens.size(), 1);  // Just EOF
    EXPECT_EQ(tokens[0].kind, TokenKind::EndOfFile);
}

TEST(LexerTest, Keywords) {
    std::string source = "let const var function return if else while for";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    ASSERT_EQ(tokens.size(), 10);  // 9 tokens + EOF
    EXPECT_EQ(tokens[0].kind, TokenKind::Let);
    EXPECT_EQ(tokens[1].kind, TokenKind::Const);
    EXPECT_EQ(tokens[2].kind, TokenKind::Var);
    EXPECT_EQ(tokens[3].kind, TokenKind::Function);
    EXPECT_EQ(tokens[4].kind, TokenKind::Return);
    EXPECT_EQ(tokens[5].kind, TokenKind::If);
    EXPECT_EQ(tokens[6].kind, TokenKind::Else);
    EXPECT_EQ(tokens[7].kind, TokenKind::While);
    EXPECT_EQ(tokens[8].kind, TokenKind::For);
    EXPECT_EQ(tokens[9].kind, TokenKind::EndOfFile);
}

TEST(LexerTest, Identifiers) {
    std::string source = "x _y z123 _123";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    ASSERT_EQ(tokens.size(), 5);  // 4 tokens + EOF
    EXPECT_EQ(tokens[0].kind, TokenKind::Identifier);
    EXPECT_EQ(tokens[0].text, "x");
    EXPECT_EQ(tokens[1].kind, TokenKind::Identifier);
    EXPECT_EQ(tokens[1].text, "_y");
    EXPECT_EQ(tokens[2].kind, TokenKind::Identifier);
    EXPECT_EQ(tokens[2].text, "z123");
    EXPECT_EQ(tokens[3].kind, TokenKind::Identifier);
    EXPECT_EQ(tokens[3].text, "_123");
    EXPECT_EQ(tokens[4].kind, TokenKind::EndOfFile);
}

TEST(LexerTest, ErrorHandling) {
    std::string source = "\"unterminated string";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    ASSERT_EQ(tokens.size(), 2);  // Error token + EOF
    EXPECT_EQ(tokens[0].kind, TokenKind::Error);
    EXPECT_EQ(tokens[0].text, "Unterminated string");
    EXPECT_EQ(tokens[1].kind, TokenKind::EndOfFile);
}

int main(int argc, char** argv) {
    testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
} 