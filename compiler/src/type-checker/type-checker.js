// TypeChecker for Super-JS Compiler
// Traverses the AST and checks types

class TypeChecker {
    constructor() {
        // Type environment: variable name -> type
        this.env = {};
        // TODO: Add support for scopes (stack of envs)
    }

    check(ast) {
        if (!ast || ast.type !== 'Program') {
            throw new Error('TypeChecker expects a Program AST node');
        }
        for (const node of ast.body) {
            this.checkNode(node);
        }
    }

    checkNode(node) {
        switch (node.type) {
            case 'VariableDeclaration':
                this.checkVariableDeclaration(node);
                break;
            // TODO: Add cases for FunctionDeclaration, ClassDeclaration, etc.
            default:
                // TODO: Handle other node types
                break;
        }
    }

    checkVariableDeclaration(node) {
        const { id, varType, init } = node;
        if (typeof id === 'string') {
            // Register variable in environment
            this.env[id] = varType || (init ? this.inferType(init) : 'any');
            // Check initializer type if present
            if (init) {
                const initType = this.inferType(init);
                if (varType && initType !== varType) {
                    // TODO: Add better type compatibility checks
                    throw new Error(`Type error: variable '${id}' declared as ${varType} but initialized with ${initType}`);
                }
            }
        }
        // TODO: Handle destructuring
    }

    inferType(expr) {
        // Very basic type inference for literals and identifiers
        switch (expr.type) {
            case 'Literal':
                return typeof expr.value;
            case 'Identifier':
                return this.env[expr.name] || 'any';
            // TODO: Handle BinaryExpression, CallExpression, etc.
            default:
                return 'any';
        }
    }
}

module.exports = TypeChecker; 