const fs = require('fs');
const path = require('path');
const { Lexer } = require('./lexer');

function testLexer(filePath) {
    try {
        const source = fs.readFileSync(filePath, 'utf8');
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();
        
        console.log(`\n=== Tokens for ${path.basename(filePath)} ===`);
        tokens.forEach(token => {
            console.log(token.toString());
        });
        console.log(`Total tokens: ${tokens.length}\n`);
        
        return tokens;
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
        return null;
    }
}

// Get all .sjs files from the examples directory
const examplesDir = path.join(__dirname, '../../examples');
const files = fs.readdirSync(examplesDir)
    .filter(file => file.endsWith('.sjs'))
    .map(file => path.join(examplesDir, file));

// Process each file
console.log('Starting lexer tests...\n');
files.forEach(file => {
    testLexer(file);
}); 