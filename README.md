# super.js

> A strict, clean, and efficient superset of JavaScript that enforces ECMA standards with built-in type safety.

## Overview

super.js is a programming language that builds upon JavaScript while strictly adhering to ECMA standards. It provides type safety similar to TypeScript but maintains a focus on pure JavaScript semantics. The type system is designed to be intuitive and fully compliant with ECMA standards, while providing built-in tooling for a superior development experience.

## Key Features

- **Pure JavaScript Semantics**: Strictly follows ECMA standards without additional language features
- **Type Safety**: Static type checking with JavaScript-first approach
- **Type Inference**: Smart type inference based on ECMA standard patterns
- **Built-in Code Formatting**: Integrated formatter similar to Prettier
- **Integrated Linting**: Built-in linting rules based on ECMA standards
- **Native Testing Framework**: Integrated testing capabilities similar to Jest
- **Universal Compilation**: Supports both frontend and backend environments
- **Zero Configuration**: Works out of the box with sensible defaults
- **Fast Compilation**: Optimized compilation process for quick development cycles

## Installation

```bash
npm install -g superjs
```

## Usage

### Creating a new project

```bash
superjs init my-project
cd my-project
```

### Running the compiler

```bash
superjs build
```

### Development mode with watch

```bash
superjs dev
```

### Running tests

```bash
superjs test
```

## File Extension

super.js files use the `.sjs` extension and support type annotations:

```javascript
// example.sjs
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Type inference
const numbers = [1, 2, 3]; // inferred as number[]
const user = {
  name: "John",
  age: 30
}; // inferred as { name: string, age: number }

// Interface declaration
interface User {
  name: string;
  age: number;
  email?: string; // Optional property
}

// Type safety with classes
class UserAccount {
  constructor(public user: User) {}
  
  updateEmail(newEmail: string): void {
    this.user.email = newEmail;
  }
}
```

## Configuration

super.js works out of the box with zero configuration. However, you can customize its behavior using `super.config.js`:

```javascript
// super.config.js
module.exports = {
  target: 'node', // or 'web'
  format: {
    printWidth: 80,
    semi: true,
    singleQuote: true,
  },
  types: {
    strict: true, // Enable strict type checking
    noImplicitAny: true, // Don't allow implicit 'any' type
    checkJs: false, // Type check .js files
  },
  lint: {
    rules: {
      // custom lint rules
    }
  },
  test: {
    coverage: true,
    testMatch: ['**/*.test.sjs']
  }
};
```

## Core Principles

1. **ECMA Standard Compliance**: All code must strictly follow ECMA standards
2. **Type Safety First**: Strong type system while maintaining JavaScript semantics
3. **Built-in Quality Tools**: Integrated formatting, linting, and testing
4. **Universal Compatibility**: Works seamlessly in both browser and Node.js environments
5. **Developer Experience**: Focus on providing the best development experience out of the box

## Comparison with Other Languages

### super.js vs TypeScript
- super.js maintains pure JavaScript semantics with type safety
- Type system designed around ECMA standards
- Built-in tooling (formatter, linter, testing)
- Faster compilation
- Zero configuration needed for most use cases

### super.js vs JavaScript
- Stricter ECMA standards enforcement
- Integrated development tools
- Better error messages
- Optimized compilation

## Best Practices

1. Use native JavaScript features
2. Follow ECMA standards strictly
3. Write tests for all functionality
4. Leverage built-in tools

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details. 