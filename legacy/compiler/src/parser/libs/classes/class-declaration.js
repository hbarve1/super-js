const { CLASS_DECLARATION, CLASS_PROPERTY } = require('../../../utils/ast-node-types');
const parseMethodDefinition = require('./method-definition');

function parseClassDeclaration(parser) {
    parser.expect(parser.TokenType.KEYWORD, 'class');
    const idToken = parser.expect(parser.TokenType.IDENTIFIER);
    let superClass = null;
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'extends') {
        parser.advance();
        if (parser.current.type === parser.TokenType.IDENTIFIER) {
            superClass = parser.current.value;
            parser.advance();
        }
    }
    if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'implements') {
        while (parser.current.type !== parser.TokenType.LEFT_BRACE && parser.current.type !== parser.TokenType.EOF) {
            parser.advance();
        }
    }
    parser.expect(parser.TokenType.LEFT_BRACE);
    const body = [];
    while (parser.current.type !== parser.TokenType.RIGHT_BRACE && parser.current.type !== parser.TokenType.EOF) {
        if (parser.current.type === parser.TokenType.IDENTIFIER) {
            const key = parser.current.value;
            parser.advance();
            let varType = null;
            if (parser.current.type === parser.TokenType.COLON) {
                parser.advance();
                varType = parser.parseTypeAnnotation();
            }
            if (parser.current.type === parser.TokenType.LEFT_PAREN) {
                const method = parseMethodDefinition(parser, key);
                body.push(method);
            } else {
                if (parser.current.type === parser.TokenType.SEMICOLON) parser.advance();
                body.push({ type: CLASS_PROPERTY, key, varType });
            }
        } else if (parser.current.type === parser.TokenType.KEYWORD && parser.current.value === 'constructor') {
            const key = 'constructor';
            parser.advance();
            const method = parseMethodDefinition(parser, key);
            body.push(method);
        } else {
            parser.advance();
        }
    }
    parser.expect(parser.TokenType.RIGHT_BRACE);
    return {
        type: CLASS_DECLARATION,
        id: idToken.value,
        superClass,
        body
    };
}

module.exports = parseClassDeclaration;
