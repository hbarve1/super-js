#include "Lexer.h"
#include <cctype>
#include <unordered_map>

namespace superjs {

namespace {
    const std::unordered_map<std::string, TokenKind> keywords = {
        {"let", TokenKind::Let},
        {"const", TokenKind::Const},
        {"var", TokenKind::Var},
        {"function", TokenKind::Function},
        {"class", TokenKind::Class},
        {"interface", TokenKind::Interface},
        {"type", TokenKind::Type},
        {"if", TokenKind::If},
        {"else", TokenKind::Else},
        {"while", TokenKind::While},
        {"for", TokenKind::For},
        {"return", TokenKind::Return},
        {"break", TokenKind::Break},
        {"continue", TokenKind::Continue},
        {"try", TokenKind::Try},
        {"catch", TokenKind::Catch},
        {"finally", TokenKind::Finally},
        {"throw", TokenKind::Throw},
        {"new", TokenKind::New},
        {"delete", TokenKind::Delete},
        {"typeof", TokenKind::Typeof},
        {"instanceof", TokenKind::Instanceof},
        {"void", TokenKind::Void},
        {"private", TokenKind::Private},
        {"protected", TokenKind::Protected},
        {"public", TokenKind::Public},
        {"static", TokenKind::Static},
        {"readonly", TokenKind::Readonly},
        {"abstract", TokenKind::Abstract},
        {"async", TokenKind::Async},
        {"await", TokenKind::Await},
        {"true", TokenKind::Boolean},
        {"false", TokenKind::Boolean},
        {"null", TokenKind::Null},
        {"undefined", TokenKind::Undefined}
    };
}

Lexer::Lexer(const std::string& source)
    : source(source)
    , current(0)
    , start(0)
    , line(1)
    , column(1)
{}

Token Lexer::nextToken() {
    skipWhitespace();
    
    start = current;
    
    if (isAtEnd()) {
        return makeToken(TokenKind::EndOfFile);
    }
    
    char c = advance();
    
    // Handle identifiers and keywords
    if (std::isalpha(c) || c == '_') {
        return scanIdentifier();
    }
    
    // Handle numbers
    if (std::isdigit(c)) {
        return scanNumber();
    }
    
    // Handle strings
    if (c == '"' || c == '\'') {
        return scanString();
    }
    
    // Handle template literals
    if (c == '`') {
        return scanTemplate();
    }
    
    // Handle JSX
    // if (c == '<') {
    //     return scanJSX();
    // }
    
    // Handle operators and punctuation
    switch (c) {
        case '(': return makeToken(TokenKind::LeftParen);
        case ')': return makeToken(TokenKind::RightParen);
        case '{': return makeToken(TokenKind::LeftBrace);
        case '}': return makeToken(TokenKind::RightBrace);
        case '[': return makeToken(TokenKind::LeftBracket);
        case ']': return makeToken(TokenKind::RightBracket);
        case ';': return makeToken(TokenKind::Semicolon);
        case ',': return makeToken(TokenKind::Comma);
        case '.': return makeToken(TokenKind::Dot);
        case '-': return match('-') ? makeToken(TokenKind::MinusMinus) : makeToken(TokenKind::Minus);
        case '+': return match('+') ? makeToken(TokenKind::PlusPlus) : makeToken(TokenKind::Plus);
        case '/': return makeToken(TokenKind::Slash);
        case '*': return makeToken(TokenKind::Star);
        case '%': return makeToken(TokenKind::Percent);
        case '!': 
            if (match('=')) {
                return makeToken(TokenKind::BangEqual);
            }
            return makeToken(TokenKind::Bang);
        case '=':
            if (match('=')) return makeToken(TokenKind::EqualEqual);
            if (match('>')) return makeToken(TokenKind::Arrow);
            return makeToken(TokenKind::Equal);
        case '<': 
            if (match('=')) {
                return makeToken(TokenKind::LessEqual);
            }
            return makeToken(TokenKind::Less);
        case '>': 
            if (match('=')) {
                return makeToken(TokenKind::GreaterEqual);
            }
            return makeToken(TokenKind::Greater);
        case '&': return match('&') ? makeToken(TokenKind::And) : errorToken("Expected '&'");
        case '|': return match('|') ? makeToken(TokenKind::Or) : errorToken("Expected '|'");
        case '?': return makeToken(TokenKind::Question);
        case ':': return makeToken(TokenKind::Colon);
    }
    
    return errorToken("Unexpected character");
}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;
    Token token;
    do {
        token = nextToken();
        tokens.push_back(token);
        if (token.kind == TokenKind::Error) {
            tokens.push_back(makeToken(TokenKind::EndOfFile));
            break;
        }
    } while (token.kind != TokenKind::EndOfFile);

    return tokens;
}

char Lexer::currentChar() const {
    if (isAtEnd()) return '\0';
    return source[current];
}

char Lexer::peek() const {
    if (isAtEnd()) return '\0';
    return source[current + 1];
}

char Lexer::advance() {
    char c = currentChar();
    current++;
    column++;
    return c;
}

bool Lexer::isAtEnd() const {
    return current >= source.length();
}

bool Lexer::match(char expected) {
    if (isAtEnd() || currentChar() != expected) return false;
    current++;
    column++;
    return true;
}

void Lexer::skipWhitespace() {
    while (true) {
        char c = currentChar();
        switch (c) {
            case ' ':
            case '\r':
            case '\t':
                advance();
                break;
            case '\n':
                line++;
                column = 1;
                advance();
                break;
            case '/':
                if (peek() == '/') {
                    // Single-line comment
                    while (currentChar() != '\n' && !isAtEnd()) advance();
                } else if (peek() == '*') {
                    // Multi-line comment
                    advance(); // Skip '/'
                    advance(); // Skip '*'
                    while (!isAtEnd() && !(currentChar() == '*' && peek() == '/')) {
                        if (currentChar() == '\n') {
                            line++;
                            column = 1;
                        }
                        advance();
                    }
                    if (!isAtEnd()) {
                        advance(); // Skip '*'
                        advance(); // Skip '/'
                    }
                } else {
                    return;
                }
                break;
            default:
                return;
        }
    }
}

Token Lexer::scanIdentifier() {
    while (std::isalnum(currentChar()) || currentChar() == '_') advance();
    
    std::string text = source.substr(start, current - start);
    auto it = keywords.find(text);
    TokenKind kind = (it != keywords.end()) ? it->second : TokenKind::Identifier;
    
    return makeToken(kind);
}

Token Lexer::scanNumber() {
    while (std::isdigit(currentChar())) advance();
    
    // Handle decimal point
    if (currentChar() == '.' && std::isdigit(peek())) {
        advance(); // Consume the '.'
        while (std::isdigit(currentChar())) advance();
    }
    
    return makeToken(TokenKind::Number);
}

Token Lexer::scanString() {
    char quote = source[start];
    while (currentChar() != quote && !isAtEnd()) {
        if (currentChar() == '\n') {
            line++;
            column = 1;
        }
        advance();
    }
    
    if (isAtEnd()) {
        return errorToken("Unterminated string");
    }
    
    advance(); // Consume the closing quote
    return makeToken(TokenKind::String);
}

Token Lexer::scanTemplate() {
    while (currentChar() != '`' && !isAtEnd()) {
        if (currentChar() == '\n') {
            line++;
            column = 1;
        }
        advance();
    }
    
    if (isAtEnd()) {
        return errorToken("Unterminated template literal");
    }
    
    advance(); // Consume the closing backtick
    return makeToken(TokenKind::TemplateStart);
}

Token Lexer::scanJSX() {
    if (currentChar() == '/') {
        advance();
        return makeToken(TokenKind::JSXClose);
    }
    return makeToken(TokenKind::JSXOpen);
}

Token Lexer::makeToken(TokenKind kind) {
    std::string text = source.substr(start, current - start);
    return Token(kind, text, line, column - (current - start));
}

Token Lexer::errorToken(const std::string& message) {
    return Token(TokenKind::Error, message, line, column);
}

} // namespace superjs 