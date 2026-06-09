#include "../../include/parser/StatementParser.h"
#include "../../include/ast/Expressions.h"
#include <memory>
#include <iostream>

namespace superjs {

// Helper to peek one token ahead
bool StatementParser::checkNext(TokenKind kind) {
    if (current + 1 >= tokens.size()) return false;
    return tokens[current + 1].kind == kind;
}

std::unique_ptr<Statement> StatementParser::parseStatement() {
    std::cerr << "StatementParser::parseStatement() - Current token: " << peek().text << " (kind: " << static_cast<int>(peek().kind) << ")" << std::endl;

    if (match(TokenKind::If)) {
        std::cerr << "Found if statement" << std::endl;
        return parseIfStatement();
    }

    if (match(TokenKind::While)) {
        std::cerr << "Found while statement" << std::endl;
        return parseWhileStatement();
    }

    if (match(TokenKind::For)) {
        std::cerr << "Found for statement" << std::endl;
        return parseForStatement();
    }

    if (match(TokenKind::Return)) {
        std::cerr << "Found return statement" << std::endl;
        return parseReturnStatement();
    }

    if (match(TokenKind::Function)) {
        std::cerr << "Found function declaration" << std::endl;
        return parseFunctionDeclaration();
    }

    if (match(TokenKind::Class)) {
        std::cerr << "Found class declaration" << std::endl;
        return parseClassDeclaration();
    }

    // Only match let/const if not in for-loop context
    if ((check(TokenKind::Let) || check(TokenKind::Const)) && !checkNext(TokenKind::LeftParen)) {
        advance();
        std::cerr << "Found variable declaration" << std::endl;
        return parseVariableDeclaration();
    }

    if (match(TokenKind::Export)) {
        std::cerr << "Found export statement" << std::endl;
        return parseExportStatement();
    }

    if (match(TokenKind::Import)) {
        std::cerr << "Found import statement" << std::endl;
        return parseImportStatement();
    }

    if (match(TokenKind::Type)) {
        std::cerr << "Found type declaration" << std::endl;
        return parseTypeDeclaration();
    }

    if (match(TokenKind::Interface)) {
        std::cerr << "Found interface declaration" << std::endl;
        return parseInterfaceDeclaration();
    }

    if (match(TokenKind::Break)) {
        std::cerr << "Found break statement" << std::endl;
        return parseBreakStatement();
    }

    if (match(TokenKind::Continue)) {
        std::cerr << "Found continue statement" << std::endl;
        return parseContinueStatement();
    }

    if (match(TokenKind::LeftBrace)) {
        std::cerr << "Found block statement" << std::endl;
        return parseBlockStatement();
    }

    std::cerr << "Parsing expression statement" << std::endl;
    auto expr = exprParser.parseExpression();
    if (!expr) {
        if (match(TokenKind::Semicolon)) {
            std::cerr << "Empty statement (just a semicolon)" << std::endl;
            return nullptr; // skip adding empty statement, but do not break parsing
        }
        std::cerr << "Failed to parse expression" << std::endl;
        synchronize();
        return nullptr;
    }

    // Always wrap expressions in ExpressionStatement
    if (match(TokenKind::Semicolon)) {
        std::cerr << "Successfully parsed expression statement (with semicolon)" << std::endl;
        return std::make_unique<ExpressionStatement>(std::move(expr));
    } else {
        std::cerr << "Expected semicolon after expression" << std::endl;
        synchronize();
        return std::make_unique<ExpressionStatement>(std::move(expr));
    }
}

std::unique_ptr<Statement> StatementParser::parseBlockStatement() {
    std::vector<std::unique_ptr<Statement>> statements;

    while (!check(TokenKind::RightBrace) && !isAtEnd()) {
        auto stmt = parseStatement();
        if (stmt) {
            statements.push_back(std::move(stmt));
        } else {
            synchronize();
        }
    }

    consume(TokenKind::RightBrace, "Expect '}' after block.");
    return std::make_unique<BlockStatement>(std::move(statements));
}

std::unique_ptr<Statement> StatementParser::parseIfStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'if'.");
    auto condition = exprParser.parseExpression();
    consume(TokenKind::RightParen, "Expect ')' after if condition.");

    auto thenBranch = parseStatement();
    std::unique_ptr<Statement> elseBranch = nullptr;
    if (match(TokenKind::Else)) {
        elseBranch = parseStatement();
    }

    return std::make_unique<IfStatement>(std::move(condition), std::move(thenBranch), std::move(elseBranch));
}

std::unique_ptr<Statement> StatementParser::parseWhileStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'while'.");
    auto condition = exprParser.parseExpression();
    consume(TokenKind::RightParen, "Expect ')' after while condition.");

    auto body = parseStatement();
    return std::make_unique<WhileStatement>(std::move(condition), std::move(body));
}

std::unique_ptr<Statement> StatementParser::parseForStatement() {
    std::cerr << "Found for statement" << std::endl;
    consume(TokenKind::LeftParen, "Expect '(' after 'for'.");

    // Parse initializer
    std::unique_ptr<Statement> initializer;
    if (match(TokenKind::Semicolon)) {
        initializer = nullptr;
    } else if (match(TokenKind::Let)) {
        // Handle multiple variable declarations
        std::vector<std::unique_ptr<Statement>> declarations;
        do {
            Token name = consume(TokenKind::Identifier, "Expect variable name.");
            std::unique_ptr<Type> typeAnnotation = nullptr;
            if (match(TokenKind::Colon)) {
                typeAnnotation = typeParser.parseType();
            }
            std::unique_ptr<Expression> initializer = nullptr;
            if (match(TokenKind::Equal)) {
                initializer = exprParser.parseExpression();
            }
            declarations.push_back(std::make_unique<VariableDeclaration>(name, std::move(typeAnnotation), std::move(initializer)));
        } while (match(TokenKind::Comma));
        consume(TokenKind::Semicolon, "Expect ';' after loop initializer.");
        
        // Create a single block statement for all declarations
        initializer = std::make_unique<BlockStatement>(std::move(declarations));
    } else {
        initializer = parseExpressionStatement();
    }

    // Parse condition
    std::unique_ptr<Expression> condition = nullptr;
    if (!check(TokenKind::Semicolon)) {
        condition = exprParser.parseExpression();
    }
    consume(TokenKind::Semicolon, "Expect ';' after loop condition.");

    // Parse increment
    std::unique_ptr<Expression> increment = nullptr;
    if (!check(TokenKind::RightParen)) {
        increment = exprParser.parseExpression();
    }
    consume(TokenKind::RightParen, "Expect ')' after for clauses.");

    // Parse body
    auto body = parseStatement();

    // Desugar for loop into while loop
    if (increment != nullptr) {
        std::vector<std::unique_ptr<Statement>> bodyStatements;
        bodyStatements.push_back(std::move(body));
        bodyStatements.push_back(std::make_unique<ExpressionStatement>(std::move(increment)));
        body = std::make_unique<BlockStatement>(std::move(bodyStatements));
    }

    if (condition == nullptr) {
        condition = std::make_unique<LiteralExpression>(Token(TokenKind::True, "true", 0, 0));
    }

    auto whileLoop = std::make_unique<WhileStatement>(std::move(condition), std::move(body));

    // Always return a BlockStatement for the for loop
    std::vector<std::unique_ptr<Statement>> statements;
    if (initializer != nullptr) {
        statements.push_back(std::move(initializer));
    }
    statements.push_back(std::move(whileLoop));
    return std::make_unique<BlockStatement>(std::move(statements));
}

std::unique_ptr<Statement> StatementParser::parseReturnStatement() {
    Token keyword = previous();
    std::unique_ptr<Expression> value = nullptr;
    if (!check(TokenKind::Semicolon)) {
        value = exprParser.parseExpression();
    }

    consume(TokenKind::Semicolon, "Expect ';' after return value.");
    return std::make_unique<ReturnStatement>(keyword, std::move(value));
}

std::unique_ptr<Statement> StatementParser::parseFunctionDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect function name.");
    consume(TokenKind::LeftParen, "Expect '(' after function name.");

    std::vector<Token> parameters;
    std::vector<std::unique_ptr<Type>> paramTypes;
    if (!check(TokenKind::RightParen)) {
        do {
            if (parameters.size() >= 255) {
                error(peek(), "Cannot have more than 255 parameters.");
            }
            Token param = consume(TokenKind::Identifier, "Expect parameter name.");
            parameters.push_back(param);

            if (match(TokenKind::Colon)) {
                paramTypes.push_back(typeParser.parseType());
            } else {
                paramTypes.push_back(nullptr);
            }
        } while (match(TokenKind::Comma));
    }
    consume(TokenKind::RightParen, "Expect ')' after parameters.");

    std::unique_ptr<Type> returnType = nullptr;
    if (match(TokenKind::Colon)) {
        returnType = typeParser.parseType();
    }

    consume(TokenKind::LeftBrace, "Expect '{' before function body.");
    auto body = parseBlockStatement();

    return std::make_unique<FunctionDeclaration>(
        name,
        std::move(parameters),
        std::move(paramTypes),
        std::move(returnType),
        std::move(body)
    );
}

std::unique_ptr<Statement> StatementParser::parseClassDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect class name.");

    std::unique_ptr<VariableExpression> superclass = nullptr;
    if (match(TokenKind::Less)) {
        consume(TokenKind::Identifier, "Expect superclass name.");
        superclass = std::make_unique<VariableExpression>(previous());
    }

    consume(TokenKind::LeftBrace, "Expect '{' before class body.");

    std::vector<std::unique_ptr<Statement>> methods;
    while (!check(TokenKind::RightBrace) && !isAtEnd()) {
        methods.push_back(parseFunctionDeclaration());
    }

    consume(TokenKind::RightBrace, "Expect '}' after class body.");
    return std::make_unique<ClassDeclaration>(name, std::move(superclass), std::move(methods));
}

std::unique_ptr<Statement> StatementParser::parseVariableDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect variable name.");
    
    std::unique_ptr<Type> typeAnnotation = nullptr;
    if (match(TokenKind::Colon)) {
        typeAnnotation = typeParser.parseType();
    }
    
    std::unique_ptr<Expression> initializer = nullptr;
    if (match(TokenKind::Equal)) {
        initializer = exprParser.parseExpression();
    }
    
    consume(TokenKind::Semicolon, "Expect ';' after variable declaration.");
    return std::make_unique<VariableDeclaration>(name, std::move(typeAnnotation), std::move(initializer));
}

std::unique_ptr<Statement> StatementParser::parseExportStatement() {
    std::unique_ptr<Statement> declaration;
    
    if (match(TokenKind::Default)) {
        if (match(TokenKind::Function)) {
            declaration = parseFunctionDeclaration();
        } else if (match(TokenKind::Class)) {
            declaration = parseClassDeclaration();
        } else {
            throw error(peek(), "Expect function or class after 'export default'.");
        }
    } else {
        declaration = parseStatement();
    }
    
    return std::make_unique<ExportStatement>(std::move(declaration));
}

std::unique_ptr<Statement> StatementParser::parseImportStatement() {
    Token module = consume(TokenKind::String, "Expect module path.");
    
    std::vector<Token> names;
    if (match(TokenKind::LeftBrace)) {
        if (!check(TokenKind::RightBrace)) {
            do {
                names.push_back(consume(TokenKind::Identifier, "Expect import name."));
            } while (match(TokenKind::Comma));
        }
        consume(TokenKind::RightBrace, "Expect '}' after import names.");
    } else {
        names.push_back(consume(TokenKind::Identifier, "Expect import name."));
    }
    
    consume(TokenKind::Semicolon, "Expect ';' after import statement.");
    return std::make_unique<ImportStatement>(module, std::move(names));
}

std::unique_ptr<Statement> StatementParser::parseTypeDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect type name.");
    consume(TokenKind::Equal, "Expect '=' after type name.");
    
    auto type = typeParser.parseType();
    consume(TokenKind::Semicolon, "Expect ';' after type declaration.");
    
    return std::make_unique<TypeDeclaration>(name, std::move(type));
}

std::unique_ptr<Statement> StatementParser::parseInterfaceDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect interface name.");
    consume(TokenKind::LeftBrace, "Expect '{' before interface body.");
    
    std::vector<std::pair<Token, std::unique_ptr<Type>>> properties;
    while (!check(TokenKind::RightBrace) && !isAtEnd()) {
        Token propName = consume(TokenKind::Identifier, "Expect property name.");
        consume(TokenKind::Colon, "Expect ':' after property name.");
        properties.push_back({propName, typeParser.parseType()});
        consume(TokenKind::Semicolon, "Expect ';' after property declaration.");
    }
    
    consume(TokenKind::RightBrace, "Expect '}' after interface body.");
    return std::make_unique<InterfaceDeclaration>(name, std::move(properties));
}

std::unique_ptr<Statement> StatementParser::parseBreakStatement() {
    Token keyword = previous();
    consume(TokenKind::Semicolon, "Expect ';' after 'break'.");
    return std::make_unique<BreakStatement>(keyword);
}

std::unique_ptr<Statement> StatementParser::parseContinueStatement() {
    Token keyword = previous();
    consume(TokenKind::Semicolon, "Expect ';' after 'continue'.");
    return std::make_unique<ContinueStatement>(keyword);
}

std::unique_ptr<Statement> StatementParser::parseExpressionStatement() {
    auto expr = exprParser.parseExpression();
    consume(TokenKind::Semicolon, "Expect ';' after expression.");
    return std::make_unique<ExpressionStatement>(std::move(expr));
}

} // namespace superjs 