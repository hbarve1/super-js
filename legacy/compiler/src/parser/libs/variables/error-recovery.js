// Helpers for error handling and recovery in variable parsing
function recoverInvalidDeclarator(kindToken, idNode) {
    return {
        type: 'VariableDeclaration',
        kind: kindToken.value,
        id: idNode,
        varType: null,
        init: null,
        error: 'Invalid variable declarator'
    };
}

function recoverInvalidInit(e) {
    return { type: 'Expression', stub: true, error: e.message };
}

module.exports = { recoverInvalidDeclarator, recoverInvalidInit };
