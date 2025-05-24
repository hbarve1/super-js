#pragma once

#include "ParserBase.h"
#include "../ast/Expressions.h"
#include "../ast/Statements.h"
#include "../ast/Type.h"
#include "../ast/Types.h"
#include <memory>
#include <vector>
#include <string>
#include "../lexer/Token.h"
#include "AST.h"
#include "ParseError.h"

namespace superjs {

// Forward declarations
class Expression;

class ExpressionParser : public ParserBase {
public:
    explicit ExpressionParser(std::vector<Token>& tokens, size_t& current)
        : ParserBase(tokens, current) {}

    std::unique_ptr<Expression> parseExpression();
    std::unique_ptr<Expression> parseAssignment();
    std::unique_ptr<Expression> parseEquality();
    std::unique_ptr<Expression> parseComparison();
    std::unique_ptr<Expression> parseTerm();
    std::unique_ptr<Expression> parseFactor();
    std::unique_ptr<Expression> parseUnary();
    std::unique_ptr<Expression> parseCall();
    std::unique_ptr<Expression> parsePrimary();
    std::unique_ptr<Expression> parseFunctionExpression();
    std::unique_ptr<Expression> parseClassExpression();
    std::unique_ptr<Expression> parseJSXExpression();

private:
    // Helper methods
    bool match(TokenKind kind);
    bool check(TokenKind kind) const;
    Token advance();
    Token peek() const;
    Token previous() const;
    bool isAtEnd() const;
    Token consume(TokenKind kind, const std::string& message);
    ParseError error(const Token& token, const std::string& message);
    std::unique_ptr<Expression> finishCall(std::unique_ptr<Expression> callee);
};

} // namespace superjs 