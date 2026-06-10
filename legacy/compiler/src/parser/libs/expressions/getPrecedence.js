
function getPrecedence(token) {
    const op = token.value;
    if (op === '===') return 3;
    if (op === '!==') return 3;
    if (op === '+' || op === '-') return 2;
    if (op === '*' || op === '/') return 4;
    if (op === '=') return 1;
    return 0;
}

module.exports = {
    getPrecedence,
}; 
