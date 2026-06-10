
function isBinaryOperator(token) {
    return token.type === 'OPERATOR' || token.type === 'ASSIGNMENT';
}

module.exports = {
    isBinaryOperator,
}; 
