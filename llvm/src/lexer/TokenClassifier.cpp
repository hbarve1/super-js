#include "../../include/lexer/TokenClassifier.h"

namespace superjs {

TokenClassifier::TokenClassifier() {
    initializeKeywords();
}

void TokenClassifier::initializeKeywords() {
    keywords = {
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
        {"true", TokenKind::True},
        {"false", TokenKind::False},
        {"null", TokenKind::Null},
        {"undefined", TokenKind::Undefined},
        {"number", TokenKind::Number},
        {"string", TokenKind::String},
        {"boolean", TokenKind::Boolean},
        {"any", TokenKind::Any},
        {"unknown", TokenKind::Unknown},
        {"never", TokenKind::Never},
        {"object", TokenKind::Object},
        {"array", TokenKind::Array}
    };
}

TokenKind TokenClassifier::classifyIdentifier(const std::string& text) const {
    auto it = keywords.find(text);
    if (it != keywords.end()) {
        return it->second;
    }
    return TokenKind::Identifier;
}

TokenKind TokenClassifier::classifyOperator(char c, char next) const {
    switch (c) {
        case '+':
            if (next == '+') return TokenKind::PlusPlus;
            if (next == '=') return TokenKind::PlusEqual;
            return TokenKind::Plus;
        case '-':
            if (next == '-') return TokenKind::MinusMinus;
            if (next == '=') return TokenKind::MinusEqual;
            return TokenKind::Minus;
        case '*':
            if (next == '=') return TokenKind::StarEqual;
            return TokenKind::Star;
        case '/':
            if (next == '=') return TokenKind::SlashEqual;
            return TokenKind::Slash;
        case '%': return TokenKind::Percent;
        case '=':
            if (next == '=') return TokenKind::EqualEqual;
            return TokenKind::Equal;
        case '!':
            if (next == '=') return TokenKind::BangEqual;
            return TokenKind::Bang;
        case '<':
            if (next == '=') return TokenKind::LessEqual;
            return TokenKind::Less;
        case '>':
            if (next == '=') return TokenKind::GreaterEqual;
            return TokenKind::Greater;
        case '&':
            if (next == '&') return TokenKind::And;
            return TokenKind::Error;
        case '|':
            if (next == '|') return TokenKind::Or;
            return TokenKind::Error;
        default:
            return TokenKind::Error;
    }
}

TokenKind TokenClassifier::classifyPunctuation(char c) const {
    switch (c) {
        case '(': return TokenKind::LeftParen;
        case ')': return TokenKind::RightParen;
        case '{': return TokenKind::LeftBrace;
        case '}': return TokenKind::RightBrace;
        case '[': return TokenKind::LeftBracket;
        case ']': return TokenKind::RightBracket;
        case ';': return TokenKind::Semicolon;
        case ',': return TokenKind::Comma;
        case '.': return TokenKind::Dot;
        case ':': return TokenKind::Colon;
        case '?': return TokenKind::Question;
        default: return TokenKind::Error;
    }
}

} // namespace superjs 