#include "../../include/parser/Parser.h"
#include "../../include/parser/AST.h"
#include "../../include/lexer/Lexer.h"
#include <stdexcept>
#include <memory>
#include <string>
#include <vector>

namespace superjs {

Parser::Parser(const std::vector<Token>& tokens)
    : tokens_(tokens), current_(0) {}

std::vector<std::unique_ptr<Statement>> Parser::parse() {
    std::vector<std::unique_ptr<Statement>> statements;
    
    while (!isAtEnd()) {
        try {
            statements.push_back(parseStatement());
        } catch (const std::runtime_error& e) {
            reportError(e.what());
            synchronize();
        }
    }
    
    return statements;
}

std::unique_ptr<Statement> Parser::parseStatement() {
    if (match(TokenKind::If)) return parseIfStatement();
    if (match(TokenKind::While)) return parseWhileStatement();
    if (match(TokenKind::For)) return parseForStatement();
    if (match(TokenKind::LeftBrace)) return parseBlockStatement();
    if (match(TokenKind::Function)) return parseFunctionDeclaration();
    if (match(TokenKind::Let) || match(TokenKind::Const)) return parseVariableDeclaration();
    if (match(TokenKind::Return)) return parseReturnStatement();
    if (match(TokenKind::Class)) return parseClassDeclaration();
    if (match(TokenKind::Import)) return parseImportStatement();
    if (match(TokenKind::Export)) return parseExportStatement();
    if (match(TokenKind::Type)) return parseTypeDeclaration();
    if (match(TokenKind::Interface)) return parseInterfaceDeclaration();
    
    return parseExpressionStatement();
}

std::unique_ptr<Expression> Parser::parseExpression() {
    return parseAssignmentExpression();
}

std::unique_ptr<Type> Parser::parseType() {
    if (match(TokenKind::Number) || match(TokenKind::String) || 
        match(TokenKind::Boolean) || match(TokenKind::Void) || 
        match(TokenKind::Any) || match(TokenKind::Unknown)) {
        return parsePrimitiveType();
    }
    if (match(TokenKind::LeftBrace)) return parseObjectType();
    if (match(TokenKind::Function)) return parseFunctionType();
    if (match(TokenKind::Identifier)) return parseGenericType();
    if (match(TokenKind::Or)) return parseUnionType();
    
    throw std::runtime_error("Expected type");
}

// Helper methods
bool Parser::match(TokenKind kind) {
    if (check(kind)) {
        advance();
        return true;
    }
    return false;
}

bool Parser::check(TokenKind kind) const {
    if (isAtEnd()) return false;
    return peek().kind == kind;
}

Token Parser::advance() {
    if (!isAtEnd()) current_++;
    return previous();
}

Token Parser::peek() const {
    return tokens_[current_];
}

Token Parser::previous() const {
    return tokens_[current_ - 1];
}

bool Parser::isAtEnd() const {
    return peek().kind == TokenKind::EndOfFile;
}

void Parser::reportError(const std::string& message) {
    errors_.push_back(message);
}

Token Parser::consume(TokenKind kind, const std::string& message) {
    if (check(kind)) return advance();
    throw std::runtime_error(message);
}

void Parser::synchronize() {
    advance();
    
    while (!isAtEnd()) {
        if (previous().kind == TokenKind::Semicolon) return;
        
        switch (peek().kind) {
            case TokenKind::Class:
            case TokenKind::Function:
            case TokenKind::Let:
            case TokenKind::Const:
            case TokenKind::For:
            case TokenKind::If:
            case TokenKind::While:
            case TokenKind::Return:
                return;
            default:
                break;
        }
        
        advance();
    }
}

std::unique_ptr<BlockStatement> Parser::parseBlockStatement() {
    std::vector<std::unique_ptr<Statement>> statements;
    while (!check(TokenKind::RightBrace) && !isAtEnd()) {
        statements.push_back(parseStatement());
    }
    consume(TokenKind::RightBrace, "Expect '}' after block.");
    return std::make_unique<BlockStatement>(std::move(statements));
}

std::unique_ptr<IfStatement> Parser::parseIfStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'if'.");
    auto condition = parseExpression();
    consume(TokenKind::RightParen, "Expect ')' after if condition.");
    auto thenBranch = parseStatement();
    std::unique_ptr<Statement> elseBranch = nullptr;
    if (match(TokenKind::Else)) {
        elseBranch = parseStatement();
    }
    return std::make_unique<IfStatement>(std::move(condition), std::move(thenBranch), std::move(elseBranch));
}

std::unique_ptr<WhileStatement> Parser::parseWhileStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'while'.");
    auto condition = parseExpression();
    consume(TokenKind::RightParen, "Expect ')' after while condition.");
    auto body = parseStatement();
    return std::make_unique<WhileStatement>(std::move(condition), std::move(body));
}

std::unique_ptr<ForStatement> Parser::parseForStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'for'.");
    std::unique_ptr<Statement> initializer;
    if (match(TokenKind::Semicolon)) {
        initializer = nullptr;
    } else if (match(TokenKind::Let) || match(TokenKind::Const) || match(TokenKind::Var)) {
        initializer = parseVariableDeclaration();
    } else {
        initializer = parseExpressionStatement();
    }
    std::unique_ptr<Expression> condition = nullptr;
    if (!check(TokenKind::Semicolon)) {
        condition = parseExpression();
    }
    consume(TokenKind::Semicolon, "Expect ';' after loop condition.");
    std::unique_ptr<Expression> increment = nullptr;
    if (!check(TokenKind::RightParen)) {
        increment = parseExpression();
    }
    consume(TokenKind::RightParen, "Expect ')' after for clauses.");
    auto body = parseStatement();
    if (increment != nullptr) {
        std::vector<std::unique_ptr<Statement>> bodyStatements;
        bodyStatements.push_back(std::move(body));
        bodyStatements.push_back(std::make_unique<ExpressionStatement>(std::move(increment)));
        body = std::make_unique<BlockStatement>(std::move(bodyStatements));
    }
    if (condition == nullptr) {
        condition = std::make_unique<LiteralExpression>(Token(TokenKind::True, "true", 0, 0));
    }
    body = std::make_unique<WhileStatement>(std::move(condition), std::move(body));
    if (initializer != nullptr) {
        std::vector<std::unique_ptr<Statement>> bodyStatements;
        bodyStatements.push_back(std::move(initializer));
        bodyStatements.push_back(std::move(body));
        body = std::make_unique<BlockStatement>(std::move(bodyStatements));
    }
    return std::make_unique<ForStatement>(std::move(initializer), std::move(condition), std::move(increment), std::move(body));
}

std::unique_ptr<ReturnStatement> Parser::parseReturnStatement() {
    Token keyword = previous();
    std::unique_ptr<Expression> value = nullptr;
    if (!check(TokenKind::Semicolon)) {
        value = parseExpression();
    }
    consume(TokenKind::Semicolon, "Expect ';' after return value.");
    return std::make_unique<ReturnStatement>(keyword, std::move(value));
}

std::unique_ptr<FunctionDeclaration> Parser::parseFunctionDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect function name.");
    consume(TokenKind::LeftParen, "Expect '(' after function name.");
    std::vector<Token> params;
    if (!check(TokenKind::RightParen)) {
        do {
            if (params.size() >= 255) {
                throw std::runtime_error("Cannot have more than 255 parameters.");
            }
            params.push_back(consume(TokenKind::Identifier, "Expect parameter name."));
        } while (match(TokenKind::Comma));
    }
    consume(TokenKind::RightParen, "Expect ')' after parameters.");
    consume(TokenKind::LeftBrace, "Expect '{' before function body.");
    auto body = parseBlockStatement();
    return std::make_unique<FunctionDeclaration>(name, std::move(params), std::move(body));
}

std::unique_ptr<ClassDeclaration> Parser::parseClassDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect class name.");
    std::unique_ptr<VariableExpression> superclass = nullptr;
    if (match(TokenKind::Less)) {
        consume(TokenKind::Identifier, "Expect superclass name.");
        superclass = std::make_unique<VariableExpression>(previous());
    }
    consume(TokenKind::LeftBrace, "Expect '{' before class body.");
    std::vector<std::unique_ptr<FunctionExpression>> methods;
    while (!check(TokenKind::RightBrace) && !isAtEnd()) {
        auto method = parseFunctionExpression();
        methods.push_back(std::move(method));
    }
    consume(TokenKind::RightBrace, "Expect '}' after class body.");
    return std::make_unique<ClassDeclaration>(name, std::move(superclass), std::move(methods));
}

std::unique_ptr<ImportStatement> Parser::parseImportStatement() {
    Token module = consume(TokenKind::String, "Expect module name.");
    std::vector<Token> names;
    if (match(TokenKind::LeftBrace)) {
        do {
            names.push_back(consume(TokenKind::Identifier, "Expect import name."));
        } while (match(TokenKind::Comma));
        consume(TokenKind::RightBrace, "Expect '}' after import names.");
    }
    consume(TokenKind::Semicolon, "Expect ';' after import statement.");
    return std::make_unique<ImportStatement>(module, std::move(names));
}

std::unique_ptr<ExportStatement> Parser::parseExportStatement() {
    auto declaration = parseStatement();
    return std::make_unique<ExportStatement>(std::move(declaration));
}

std::unique_ptr<TypeDeclaration> Parser::parseTypeDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect type name.");
    consume(TokenKind::Equal, "Expect '=' after type name.");
    auto type = parseType();
    consume(TokenKind::Semicolon, "Expect ';' after type declaration.");
    return std::make_unique<TypeDeclaration>(name, std::move(type));
}

std::unique_ptr<InterfaceDeclaration> Parser::parseInterfaceDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect interface name.");
    consume(TokenKind::LeftBrace, "Expect '{' before interface body.");
    std::vector<std::pair<Token, std::unique_ptr<Type>>> properties;
    while (!check(TokenKind::RightBrace) && !isAtEnd()) {
        Token propName = consume(TokenKind::Identifier, "Expect property name.");
        consume(TokenKind::Colon, "Expect ':' after property name.");
        auto type = parseType();
        properties.emplace_back(propName, std::move(type));
        if (!match(TokenKind::Comma)) {
            break;
        }
    }
    consume(TokenKind::RightBrace, "Expect '}' after interface body.");
    return std::make_unique<InterfaceDeclaration>(name, std::move(properties));
}

std::unique_ptr<VariableDeclaration> Parser::parseVariableDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect variable name.");
    std::unique_ptr<Type> typeAnnotation = nullptr;
    if (match(TokenKind::Colon)) {
        typeAnnotation = parseType();
    }
    std::unique_ptr<Expression> initializer = nullptr;
    if (match(TokenKind::Equal)) {
        initializer = parseExpression();
    }
    consume(TokenKind::Semicolon, "Expect ';' after variable declaration.");
    return std::make_unique<VariableDeclaration>(name, std::move(typeAnnotation), std::move(initializer));
}

std::unique_ptr<ExpressionStatement> Parser::parseExpressionStatement() {
    auto expr = parseExpression();
    consume(TokenKind::Semicolon, "Expect ';' after expression.");
    return std::make_unique<ExpressionStatement>(std::move(expr));
}

std::unique_ptr<AssignmentExpression> Parser::parseAssignmentExpression() {
    // For now, just return a nullptr or stub implementation
    // TODO: Implement assignment parsing logic
    return nullptr;
}

std::unique_ptr<BinaryExpression> Parser::parseBinaryExpression() {
    // For now, just return a nullptr or stub implementation
    // TODO: Implement binary expression parsing logic
    return nullptr;
}

std::unique_ptr<UnaryExpression> Parser::parseUnaryExpression() {
    // For now, just return a nullptr or stub implementation
    // TODO: Implement unary expression parsing logic
    return nullptr;
}

std::unique_ptr<LiteralExpression> Parser::parseLiteralExpression() {
    // For now, just return a nullptr or stub implementation
    // TODO: Implement literal expression parsing logic
    return nullptr;
}

std::unique_ptr<IdentifierExpression> Parser::parseIdentifierExpression() {
    // For now, just return a nullptr or stub implementation
    // TODO: Implement identifier expression parsing logic
    return nullptr;
}

std::unique_ptr<VariableExpression> Parser::parseVariableExpression() {
    // For now, just return a nullptr or stub implementation
    // TODO: Implement variable expression parsing logic
    return nullptr;
}

std::unique_ptr<CallExpression> Parser::parseCallExpression() {
    // For now, just return a nullptr or stub implementation
    // TODO: Implement call expression parsing logic
    return nullptr;
}

std::unique_ptr<MemberExpression> Parser::parseMemberExpression() {
    // For now, just return a nullptr or stub implementation
    // TODO: Implement member expression parsing logic
    return nullptr;
}

std::unique_ptr<FunctionExpression> Parser::parseFunctionExpression() {
    // For now, just return a nullptr or stub implementation
    // TODO: Implement function expression parsing logic
    return nullptr;
}

std::unique_ptr<ClassExpression> Parser::parseClassExpression() {
    // For now, just return a nullptr or stub implementation
    // TODO: Implement class expression parsing logic
    return nullptr;
}

std::unique_ptr<JSXExpression> Parser::parseJSXExpression() {
    // For now, just return a nullptr or stub implementation
    // TODO: Implement JSX expression parsing logic
    return nullptr;
}

std::unique_ptr<Expression> Parser::parsePrimaryExpression() {
    // For now, just return a nullptr or stub implementation
    // TODO: Implement primary expression parsing logic
    return nullptr;
}

std::unique_ptr<Expression> Parser::finishCall(std::unique_ptr<Expression> callee) {
    // For now, just return a nullptr or stub implementation
    // TODO: Implement finishCall logic
    return nullptr;
}

std::unique_ptr<PrimitiveType> Parser::parsePrimitiveType() {
    Token token = previous();
    switch (token.kind) {
        case TokenKind::Number:
            return std::make_unique<PrimitiveType>(PrimitiveType::Kind::Number);
        case TokenKind::String:
            return std::make_unique<PrimitiveType>(PrimitiveType::Kind::String);
        case TokenKind::Boolean:
            return std::make_unique<PrimitiveType>(PrimitiveType::Kind::Boolean);
        case TokenKind::Void:
            return std::make_unique<PrimitiveType>(PrimitiveType::Kind::Void);
        case TokenKind::Any:
            return std::make_unique<PrimitiveType>(PrimitiveType::Kind::Any);
        case TokenKind::Unknown:
            return std::make_unique<PrimitiveType>(PrimitiveType::Kind::Unknown);
        default:
            throw std::runtime_error("Invalid primitive type.");
    }
}

std::unique_ptr<ObjectType> Parser::parseObjectType() {
    std::vector<std::pair<Token, std::unique_ptr<Type>>> properties;
    while (!check(TokenKind::RightBrace) && !isAtEnd()) {
        Token propName = consume(TokenKind::Identifier, "Expect property name.");
        consume(TokenKind::Colon, "Expect ':' after property name.");
        auto type = parseType();
        properties.emplace_back(propName, std::move(type));
        if (!match(TokenKind::Comma)) {
            break;
        }
    }
    consume(TokenKind::RightBrace, "Expect '}' after object type.");
    return std::make_unique<ObjectType>(std::move(properties));
}

std::unique_ptr<FunctionType> Parser::parseFunctionType() {
    std::vector<std::unique_ptr<Type>> params;
    if (!check(TokenKind::RightParen)) {
        do {
            params.push_back(parseType());
        } while (match(TokenKind::Comma));
    }
    consume(TokenKind::RightParen, "Expect ')' after function parameters.");
    consume(TokenKind::Arrow, "Expect '=>' after function parameters.");
    auto returnType = parseType();
    return std::make_unique<FunctionType>(std::move(params), std::move(returnType));
}

std::unique_ptr<GenericType> Parser::parseGenericType() {
    Token name = previous();
    std::vector<std::unique_ptr<Type>> typeArgs;
    if (match(TokenKind::Less)) {
        do {
            typeArgs.push_back(parseType());
        } while (match(TokenKind::Comma));
        consume(TokenKind::Greater, "Expect '>' after generic type arguments.");
    }
    return std::make_unique<GenericType>(name.text, std::move(typeArgs));
}

std::unique_ptr<UnionType> Parser::parseUnionType() {
    std::vector<std::unique_ptr<Type>> types;
    do {
        types.push_back(parseType());
    } while (match(TokenKind::Or));
    return std::make_unique<UnionType>(std::move(types));
}

} // namespace superjs 