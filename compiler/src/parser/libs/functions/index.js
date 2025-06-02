const parseFunctionDeclaration = require('./function-declaration');
const parseMethodDefinition = require('./method-definition');
const _parseGenerics = require('./generics');
const _parseFunctionParams = require('./function-params');

module.exports = {
    parseFunctionDeclaration,
    parseMethodDefinition,
    _parseGenerics,
    _parseFunctionParams
};
