// Class declaration parsing helpers for Parser

function parseClassDeclaration(parser) {
    parser.expect(parser.TokenType.KEYWORD, 'class');
    const idToken = parser.expect(parser.TokenType.IDENTIFIER);
    // Optionally parse 'extends' and superclass
    let superClass = null;
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'extends') {
        parser.advance();
        if (parser.current.type === parser.TokenType.IDENTIFIER) {
            superClass = parser.current.value;
            parser.advance();
        }
    }
    // Optionally parse 'implements' (skip for now)
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'implements') {
        while (parser.current.type !== parser.TokenType.LEFT_BRACE && parser.current.type !== parser.TokenType.EOF) {
            parser.advance();
        }
    }
    parser.expect(parser.TokenType.LEFT_BRACE);
    const body = [];
    while (parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF) {
        // Property: IDENTIFIER [: TYPE] ;
        if (parser.current.type === parser.TokenType.IDENTIFIER) {
            const key = parser.current.value;
            parser.advance();
            let varType = null;
            if (parser.current.type === parser.TokenType.COLON) {
                parser.advance();
                varType = parser.parseTypeAnnotation();
            }
            // If next is LEFT_PAREN, it's a method
            if (parser.current.type === parser.TokenType.LEFT_PAREN) {
                // Method
                const method = parseMethodDefinition(parser, key);
                body.push(method);
            } else {
                // Property
                // Optionally expect SEMICOLON
                if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
                body.push({ type: 'ClassProperty', key, varType });
            }
        } else if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'constructor') {
            // Parse constructor as a method
            const key = 'constructor';
            parser.advance();
            const method = parseMethodDefinition(parser, key);
            body.push(method);
        } else {
            // Skip unknown tokens in class body
            parser.advance();
        }
    }
    parser.expect(parser.TokenType.RIGHT_BRACE);
    return {
        type: 'ClassDeclaration',
        id: idToken.value,
        superClass,
        body
    };
}

function parseMethodDefinition(parser, key) {
    // Parse params
    const params = parser._parseFunctionParams ? parser._parseFunctionParams() : parser.parseFunctionParams();
    // Optional return type
    let returnType = null;
    if (parser.current.type === parser.TokenType.COLON) {
        parser.advance();
        if (parser.current.type === parser.TokenType.KEYWORD || parser.current.type === parser.TokenType.IDENTIFIER) {
            returnType = parser.current.value;
            parser.advance();
        }
    }
    // Parse body
    const body = parser.parseBlockStatement();
    return {
        type: 'MethodDefinition',
        key,
        params,
        returnType,
        body
    };
}

module.exports = {
    parseClassDeclaration,
    parseMethodDefinition
}; 