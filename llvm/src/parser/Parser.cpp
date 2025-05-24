#include "parser/Parser.h"
#include "parser/AST.h"
#include "lexer/Lexer.h"
#include <stdexcept>

namespace superjs {

Parser::Parser(const std::vector<Token>& tokens)
    : tokens(tokens), current(0) {}

std::vector<std::unique_ptr<Statement>> Parser::parse() {
    std::vector<std::unique_ptr<Statement>> statements;
    while (!isAtEnd()) {
        statements.push_back(parseStatement());
    }
    return statements;
}

bool Parser::isAtEnd() const {
    return peek().kind == TokenKind::EndOfFile;
}

Token Parser::advance() {
    if (!isAtEnd()) current++;
    return previous();
}

bool Parser::check(TokenKind kind) const {
    if (isAtEnd()) return false;
    return peek().kind == kind;
}

bool Parser::match(TokenKind kind) {
    if (check(kind)) {
        advance();
        return true;
    }
    return false;
}

Token Parser::peek() const {
    return tokens[current];
}

Token Parser::previous() const {
    return tokens[current - 1];
}

Token Parser::consume(TokenKind kind, const std::string& message) {
    if (check(kind)) return advance();
    throw std::runtime_error(message);
}

std::unique_ptr<Statement> Parser::parseStatement() {
    if (match(TokenKind::Let) || match(TokenKind::Const) || match(TokenKind::Var)) {
        return parseVariableDeclaration();
    }
    if (match(TokenKind::If)) {
        return parseIfStatement();
    }
    if (match(TokenKind::While)) {
        return parseWhileStatement();
    }
    if (match(TokenKind::For)) {
        return parseForStatement();
    }
    if (match(TokenKind::Return)) {
        return parseReturnStatement();
    }
    if (match(TokenKind::Function)) {
        return parseFunctionDeclaration();
    }
    if (match(TokenKind::Class)) {
        return parseClassDeclaration();
    }
    if (match(TokenKind::Import)) {
        return parseImportStatement();
    }
    if (match(TokenKind::Export)) {
        return parseExportStatement();
    }
    if (match(TokenKind::Type)) {
        return parseTypeDeclaration();
    }
    if (match(TokenKind::Interface)) {
        return parseInterfaceDeclaration();
    }
    if (match(TokenKind::LeftBrace)) {
        return parseBlockStatement();
    }
    return std::make_unique<ExpressionStatement>(parseExpression());
}

std::unique_ptr<Statement> Parser::parseBlockStatement() {
    std::vector<std::unique_ptr<Statement>> statements;
    while (!check(TokenKind::RightBrace) && !isAtEnd()) {
        statements.push_back(parseStatement());
    }
    consume(TokenKind::RightBrace, "Expect '}' after block.");
    return std::make_unique<BlockStatement>(std::move(statements));
}

std::unique_ptr<Statement> Parser::parseIfStatement() {
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

std::unique_ptr<Statement> Parser::parseWhileStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'while'.");
    auto condition = parseExpression();
    consume(TokenKind::RightParen, "Expect ')' after while condition.");
    auto body = parseStatement();

    return std::make_unique<WhileStatement>(std::move(condition), std::move(body));
}

std::unique_ptr<Statement> Parser::parseForStatement() {
    consume(TokenKind::LeftParen, "Expect '(' after 'for'.");

    std::unique_ptr<Statement> initializer;
    if (match(TokenKind::Semicolon)) {
        initializer = nullptr;
    } else if (match(TokenKind::Let) || match(TokenKind::Const) || match(TokenKind::Var)) {
        initializer = parseVariableDeclaration();
    } else {
        initializer = std::make_unique<ExpressionStatement>(parseExpression());
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

    return body;
}

std::unique_ptr<Statement> Parser::parseReturnStatement() {
    Token keyword = previous();
    std::unique_ptr<Expression> value = nullptr;
    if (!check(TokenKind::Semicolon)) {
        value = parseExpression();
    }
    consume(TokenKind::Semicolon, "Expect ';' after return value.");
    return std::make_unique<ReturnStatement>(keyword, std::move(value));
}

std::unique_ptr<Statement> Parser::parseFunctionDeclaration() {
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

std::unique_ptr<Statement> Parser::parseClassDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect class name.");
    std::unique_ptr<VariableExpression> superclass = nullptr;
    if (match(TokenKind::Less)) {
        consume(TokenKind::Identifier, "Expect superclass name.");
        superclass = std::make_unique<VariableExpression>(previous());
    }
    consume(TokenKind::LeftBrace, "Expect '{' before class body.");
    std::vector<std::unique_ptr<FunctionExpression>> methods;
    while (!check(TokenKind::RightBrace) && !isAtEnd()) {
        methods.push_back(parseFunctionExpression());
    }
    consume(TokenKind::RightBrace, "Expect '}' after class body.");
    return std::make_unique<ClassDeclaration>(name, std::move(superclass), std::move(methods));
}

std::unique_ptr<Statement> Parser::parseImportStatement() {
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

std::unique_ptr<Statement> Parser::parseExportStatement() {
    auto declaration = parseStatement();
    return std::make_unique<ExportStatement>(std::move(declaration));
}

std::unique_ptr<Statement> Parser::parseTypeDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect type name.");
    consume(TokenKind::Equals, "Expect '=' after type name.");
    auto type = parseType();
    consume(TokenKind::Semicolon, "Expect ';' after type declaration.");
    return std::make_unique<TypeDeclaration>(name, std::move(type));
}

std::unique_ptr<Statement> Parser::parseInterfaceDeclaration() {
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

std::unique_ptr<Statement> Parser::parseVariableDeclaration() {
    Token name = consume(TokenKind::Identifier, "Expect variable name.");
    std::unique_ptr<Type> typeAnnotation = nullptr;
    if (match(TokenKind::Colon)) {
        typeAnnotation = parseType();
    }
    std::unique_ptr<Expression> initializer = nullptr;
    if (match(TokenKind::Equals)) {
        initializer = parseExpression();
    }
    consume(TokenKind::Semicolon, "Expect ';' after variable declaration.");
    return std::make_unique<VariableDeclaration>(name, std::move(typeAnnotation), std::move(initializer));
}

std::unique_ptr<Expression> Parser::parseExpression() {
    return parseAssignment();
}

std::unique_ptr<Expression> Parser::parseAssignment() {
    auto expr = parseEquality();
    if (match(TokenKind::Equals)) {
        Token equals = previous();
        auto value = parseAssignment();
        if (auto* varExpr = dynamic_cast<VariableExpression*>(expr.get())) {
            return std::make_unique<AssignmentExpression>(varExpr->name, std::move(value));
        }
        throw std::runtime_error("Invalid assignment target.");
    }
    return expr;
}

std::unique_ptr<Expression> Parser::parseEquality() {
    auto expr = parseComparison();
    while (match(TokenKind::BangEquals) || match(TokenKind::EqualsEquals)) {
        Token op = previous();
        auto right = parseComparison();
        expr = std::make_unique<BinaryExpression>(std::move(expr), op, std::move(right));
    }
    return expr;
}

std::unique_ptr<Expression> Parser::parseComparison() {
    auto expr = parseTerm();
    while (match(TokenKind::Greater) || match(TokenKind::GreaterEquals) ||
           match(TokenKind::Less) || match(TokenKind::LessEquals)) {
        Token op = previous();
        auto right = parseTerm();
        expr = std::make_unique<BinaryExpression>(std::move(expr), op, std::move(right));
    }
    return expr;
}

std::unique_ptr<Expression> Parser::parseTerm() {
    auto expr = parseFactor();
    while (match(TokenKind::Minus) || match(TokenKind::Plus)) {
        Token op = previous();
        auto right = parseFactor();
        expr = std::make_unique<BinaryExpression>(std::move(expr), op, std::move(right));
    }
    return expr;
}

std::unique_ptr<Expression> Parser::parseFactor() {
    auto expr = parseUnary();
    while (match(TokenKind::Slash) || match(TokenKind::Star)) {
        Token op = previous();
        auto right = parseUnary();
        expr = std::make_unique<BinaryExpression>(std::move(expr), op, std::move(right));
    }
    return expr;
}

std::unique_ptr<Expression> Parser::parseUnary() {
    if (match(TokenKind::Bang) || match(TokenKind::Minus)) {
        Token op = previous();
        auto right = parseUnary();
        return std::make_unique<UnaryExpression>(op, std::move(right));
    }
    return parsePrimary();
}

std::unique_ptr<Expression> Parser::parsePrimary() {
    if (match(TokenKind::False)) return std::make_unique<LiteralExpression>(previous());
    if (match(TokenKind::True)) return std::make_unique<LiteralExpression>(previous());
    if (match(TokenKind::Null)) return std::make_unique<LiteralExpression>(previous());
    if (match(TokenKind::Number) || match(TokenKind::String)) {
        return std::make_unique<LiteralExpression>(previous());
    }
    if (match(TokenKind::Identifier)) {
        return std::make_unique<VariableExpression>(previous());
    }
    if (match(TokenKind::LeftParen)) {
        auto expr = parseExpression();
        consume(TokenKind::RightParen, "Expect ')' after expression.");
        return expr;
    }
    if (match(TokenKind::Function)) {
        return parseFunctionExpression();
    }
    if (match(TokenKind::Class)) {
        return parseClassExpression();
    }
    if (match(TokenKind::Less)) {
        return parseJSXExpression();
    }
    throw std::runtime_error("Expect expression.");
}

std::unique_ptr<Expression> Parser::parseFunctionExpression() {
    consume(TokenKind::LeftParen, "Expect '(' after 'function'.");
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
    return std::make_unique<FunctionExpression>(std::move(params), std::move(body));
}

std::unique_ptr<Expression> Parser::parseClassExpression() {
    Token name = consume(TokenKind::Identifier, "Expect class name.");
    std::unique_ptr<VariableExpression> superclass = nullptr;
    if (match(TokenKind::Less)) {
        consume(TokenKind::Identifier, "Expect superclass name.");
        superclass = std::make_unique<VariableExpression>(previous());
    }
    consume(TokenKind::LeftBrace, "Expect '{' before class body.");
    std::vector<std::unique_ptr<FunctionExpression>> methods;
    while (!check(TokenKind::RightBrace) && !isAtEnd()) {
        methods.push_back(parseFunctionExpression());
    }
    consume(TokenKind::RightBrace, "Expect '}' after class body.");
    return std::make_unique<ClassExpression>(name, std::move(superclass), std::move(methods));
}

std::unique_ptr<Expression> Parser::parseJSXExpression() {
    Token tag = consume(TokenKind::Identifier, "Expect JSX tag name.");
    std::vector<std::pair<Token, std::unique_ptr<Expression>>> props;
    std::vector<std::unique_ptr<Expression>> children;
    while (!check(TokenKind::Greater) && !isAtEnd()) {
        if (match(TokenKind::Identifier)) {
            Token propName = previous();
            if (match(TokenKind::Equals)) {
                if (match(TokenKind::LeftBrace)) {
                    auto value = parseExpression();
                    consume(TokenKind::RightBrace, "Expect '}' after JSX prop value.");
                    props.emplace_back(propName, std::move(value));
                } else {
                    Token value = consume(TokenKind::String, "Expect string after '='.");
                    props.emplace_back(propName, std::make_unique<LiteralExpression>(value));
                }
            } else {
                props.emplace_back(propName, std::make_unique<LiteralExpression>(Token(TokenKind::True, "true", 0, 0)));
            }
        } else if (match(TokenKind::LeftBrace)) {
            children.push_back(parseExpression());
            consume(TokenKind::RightBrace, "Expect '}' after JSX expression.");
        } else if (match(TokenKind::String)) {
            children.push_back(std::make_unique<LiteralExpression>(previous()));
        }
    }
    consume(TokenKind::Greater, "Expect '>' after JSX tag.");
    if (match(TokenKind::Slash)) {
        consume(TokenKind::Greater, "Expect '>' after JSX closing tag.");
        return std::make_unique<JSXExpression>(tag, std::move(props), std::move(children));
    }
    while (!check(TokenKind::Less) && !isAtEnd()) {
        if (match(TokenKind::LeftBrace)) {
            children.push_back(parseExpression());
            consume(TokenKind::RightBrace, "Expect '}' after JSX expression.");
        } else if (match(TokenKind::String)) {
            children.push_back(std::make_unique<LiteralExpression>(previous()));
        } else if (match(TokenKind::Less)) {
            if (match(TokenKind::Slash)) {
                Token closingTag = consume(TokenKind::Identifier, "Expect JSX closing tag name.");
                if (closingTag.text != tag.text) {
                    throw std::runtime_error("JSX closing tag must match opening tag.");
                }
                consume(TokenKind::Greater, "Expect '>' after JSX closing tag.");
                break;
            } else {
                current--;
                children.push_back(parseJSXExpression());
            }
        }
    }
    return std::make_unique<JSXExpression>(tag, std::move(props), std::move(children));
}

std::unique_ptr<Type> Parser::parseType() {
    if (match(TokenKind::Number) || match(TokenKind::String) || match(TokenKind::Boolean) ||
        match(TokenKind::Void) || match(TokenKind::Any) || match(TokenKind::Unknown)) {
        return parsePrimitiveType();
    }
    if (match(TokenKind::LeftBrace)) {
        return parseObjectType();
    }
    if (match(TokenKind::LeftParen)) {
        return parseFunctionType();
    }
    if (match(TokenKind::Identifier)) {
        return parseGenericType();
    }
    if (match(TokenKind::Pipe)) {
        return parseUnionType();
    }
    throw std::runtime_error("Expect type.");
}

std::unique_ptr<Type> Parser::parsePrimitiveType() {
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

std::unique_ptr<Type> Parser::parseObjectType() {
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

std::unique_ptr<Type> Parser::parseFunctionType() {
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

std::unique_ptr<Type> Parser::parseGenericType() {
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

std::unique_ptr<Type> Parser::parseUnionType() {
    std::vector<std::unique_ptr<Type>> types;
    do {
        types.push_back(parseType());
    } while (match(TokenKind::Pipe));
    return std::make_unique<UnionType>(std::move(types));
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
            case TokenKind::Var:
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

} // namespace superjs 