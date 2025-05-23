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

Lexer::Lexer(std::string source)
    : source(std::move(source))
    , position(0)
    , line(1)
    , column(1)
{}

Token Lexer::nextToken() {
    skipWhitespace();

    if (isAtEnd()) {
        return makeToken(TokenKind::EndOfFile);
    }

    char c = current();
    advance();

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
        case '?': return makeToken(TokenKind::Question);
        case ':': return makeToken(TokenKind::Colon);
        case '+': return makeToken(TokenKind::Plus);
        case '-': {
            if (current() == '>') {
                advance();
                return makeToken(TokenKind::Arrow);
            }
            return makeToken(TokenKind::Minus);
        }
        case '*': return makeToken(TokenKind::Star);
        case '/': return makeToken(TokenKind::Slash);
        case '%': return makeToken(TokenKind::Percent);
        case '=': {
            if (current() == '=') {
                advance();
                return makeToken(TokenKind::EqualEqual);
            }
            return makeToken(TokenKind::Equal);
        }
        case '!': {
            if (current() == '=') {
                advance();
                return makeToken(TokenKind::BangEqual);
            }
            return makeToken(TokenKind::Bang);
        }
        case '<': {
            if (current() == '=') {
                advance();
                return makeToken(TokenKind::LessEqual);
            }
            return makeToken(TokenKind::Less);
        }
        case '>': {
            if (current() == '=') {
                advance();
                return makeToken(TokenKind::GreaterEqual);
            }
            return makeToken(TokenKind::Greater);
        }
        case '&': {
            if (current() == '&') {
                advance();
                return makeToken(TokenKind::And);
            }
            return makeError("Expected '&' after '&'");
        }
        case '|': {
            if (current() == '|') {
                advance();
                return makeToken(TokenKind::Or);
            }
            return makeError("Expected '|' after '|'");
        }
        case '"':
        case '\'': return scanString();
        case '`': return scanTemplate();
        case '<': return scanJSX();
        default:
            if (std::isdigit(c)) {
                position--; // Back up to include the digit
                return scanNumber();
            }
            if (std::isalpha(c) || c == '_') {
                position--; // Back up to include the first character
                return scanIdentifier();
            }
            return makeError("Unexpected character");
    }
}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;
    while (true) {
        Token token = nextToken();
        tokens.push_back(token);
        if (token.kind == TokenKind::EndOfFile) break;
    }
    return tokens;
}

char Lexer::current() const {
    if (isAtEnd()) return '\0';
    return source[position];
}

char Lexer::peek() const {
    if (position + 1 >= source.length()) return '\0';
    return source[position + 1];
}

void Lexer::advance() {
    if (current() == '\n') {
        line++;
        column = 1;
    } else {
        column++;
    }
    position++;
}

bool Lexer::isAtEnd() const {
    return position >= source.length();
}

void Lexer::skipWhitespace() {
    while (!isAtEnd()) {
        char c = current();
        if (std::isspace(c)) {
            advance();
        } else if (c == '/' && peek() == '/') {
            // Skip single-line comments
            while (!isAtEnd() && current() != '\n') {
                advance();
            }
        } else if (c == '/' && peek() == '*') {
            // Skip multi-line comments
            advance(); // Skip '/'
            advance(); // Skip '*'
            while (!isAtEnd() && !(current() == '*' && peek() == '/')) {
                advance();
            }
            if (!isAtEnd()) {
                advance(); // Skip '*'
                advance(); // Skip '/'
            }
        } else {
            break;
        }
    }
}

Token Lexer::makeToken(TokenKind kind) const {
    return Token{
        kind,
        source.substr(position - 1, 1),
        line,
        column - 1
    };
}

Token Lexer::makeError(const std::string& message) const {
    return Token{
        TokenKind::Error,
        message,
        line,
        column - 1
    };
}

Token Lexer::scanIdentifier() {
    size_t start = position;
    while (!isAtEnd() && (std::isalnum(current()) || current() == '_')) {
        advance();
    }

    std::string text = source.substr(start, position - start);
    auto it = keywords.find(text);
    if (it != keywords.end()) {
        return Token{it->second, text, line, column - text.length()};
    }
    return Token{TokenKind::Identifier, text, line, column - text.length()};
}

Token Lexer::scanNumber() {
    size_t start = position;
    bool hasDecimal = false;

    while (!isAtEnd() && (std::isdigit(current()) || current() == '.')) {
        if (current() == '.') {
            if (hasDecimal) break;
            hasDecimal = true;
        }
        advance();
    }

    std::string text = source.substr(start, position - start);
    return Token{TokenKind::Number, text, line, column - text.length()};
}

Token Lexer::scanString() {
    char quote = source[position - 1];
    size_t start = position;
    bool escaped = false;

    while (!isAtEnd() && (current() != quote || escaped)) {
        if (current() == '\\' && !escaped) {
            escaped = true;
        } else {
            escaped = false;
        }
        advance();
    }

    if (isAtEnd()) {
        return makeError("Unterminated string");
    }

    std::string text = source.substr(start, position - start);
    advance(); // Skip closing quote
    return Token{TokenKind::String, text, line, column - text.length() - 1};
}

Token Lexer::scanTemplate() {
    size_t start = position;
    bool inExpr = false;

    while (!isAtEnd()) {
        if (current() == '$' && peek() == '{') {
            if (!inExpr) {
                inExpr = true;
                advance(); // Skip '$'
                advance(); // Skip '{'
            }
        } else if (current() == '}' && inExpr) {
            inExpr = false;
            advance();
        } else if (current() == '`' && !inExpr) {
            break;
        } else {
            advance();
        }
    }

    if (isAtEnd()) {
        return makeError("Unterminated template literal");
    }

    std::string text = source.substr(start, position - start);
    advance(); // Skip closing backtick
    return Token{TokenKind::TemplateStart, text, line, column - text.length() - 1};
}

Token Lexer::scanJSX() {
    if (current() == '/') {
        advance();
        return makeToken(TokenKind::JSXClose);
    }
    return makeToken(TokenKind::JSXOpen);
}

} // namespace superjs 