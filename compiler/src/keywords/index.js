// Keywords organized by token categories
const keywordCategories = {
    declaration: [
        'var', 'let', 'const', 'function', 'class', 'extends', 'super', 'new', 'constructor',
        'static', 'get', 'set', 'implements', 'interface', 'enum', 'namespace', 'type',
    ],
    controlFlow: [
        'if', 'else', 'switch', 'case', 'default', 'for', 'while', 'do', 'break', 'continue',
        'return', 'yield', 'async', 'await',
    ],
    patternMatching: [
        'match', 'when',
    ],
    immutability: [
        'immutable', 'freeze',
    ],
    contract: [
        'requires', 'ensures', 'invariant',
    ],
    errorHandling: [
        'try', 'catch', 'finally', 'throw', 'throws', 'raises',
    ],
    documentation: [
        'doc', 'deprecated',
    ],
    type: [
        'string', 'number', 'boolean', 'any', 'void', 'null', 'undefined', 'never', 'unknown',
        'readonly', 'private', 'protected', 'public', 'keyof', 'typeof', 'as', 'is', 'generic', 'infer',
    ],
    module: [
        'import', 'export', 'from', 'as',
    ],
    object: [
        'this',
    ],
    operators: [
        'in', 'of', 'instanceof', 'typeof', 'delete', 'void',
    ],
    misc: [
        'with', 'debugger',
    ],
    literals: [
        'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
    ],
};

// Flat list of all keywords
const allKeywords = Object.values(keywordCategories).flat();

// Map each keyword to its category
const keywordToCategory = {};
for (const [category, keywords] of Object.entries(keywordCategories)) {
    for (const keyword of keywords) {
        keywordToCategory[keyword] = category;
    }
}

module.exports = {
    keywordCategories,
    allKeywords,
    keywordToCategory,
}; 