---
sidebar_position: 1
---

# Welcome to Super.js 0.0.1 (Alpha)

**Super.js** is a strict, clean, and efficient superset of JavaScript that enforces ECMA standards with built-in type safety, formatting, linting, and testing capabilities.

> ⚠️ **Alpha Release**: This is an alpha release intended for early adopters and development testing. Not recommended for production use.

## What is Super.js?

Super.js extends JavaScript with static type checking while maintaining pure JavaScript semantics. It provides TypeScript-like type safety with a focus on ECMA compliance and zero-configuration development experience.

### Key Features (Alpha)

- **Type Safety**: Basic static type checking with JavaScript-first approach
- **Type Inference**: Simple type inference for basic patterns
- **Basic Tooling**: Initial CLI tool and compiler
- **JavaScript Compatibility**: Full ECMAScript support
- **Zero Configuration**: Works out of the box with sensible defaults
- **Fast Compilation**: Optimized compilation process
- **Basic JSX Support**: Initial JSX syntax support

## Quick Start

### Installation

```bash
npm install -g superjs@0.0.1
```

### Your first Super.js file

Create a file with the `.sjs` extension:

```javascript
// hello.sjs
interface Greeting {
  message: string;
  recipient: string;
}

function createGreeting(recipient: string): Greeting {
  return {
    message: "Hello",
    recipient: recipient
  };
}

function formatGreeting(greeting: Greeting): string {
  return `${greeting.message}, ${greeting.recipient}!`;
}

// Usage
const greeting = createGreeting("World");
const formattedMessage = formatGreeting(greeting);
console.log(formattedMessage);
```

### Compiling and running

```bash
# Compile the file
superjs build --source hello.sjs

# Run the compiled JavaScript
node hello.js
```

## File Extension

Super.js files use the `.sjs` extension and support basic type annotations:

```javascript
// example.sjs
interface User {
  name: string;
  age: number;
  email?: string; // Optional property
}

class UserAccount {
  constructor(public user: User) {}
  
  updateEmail(newEmail: string): void {
    this.user.email = newEmail;
  }
}

// Basic type inference
const numbers = [1, 2, 3]; // inferred as number[]
const user = {
  name: "John",
  age: 30
}; // inferred as { name: string, age: number }
```

## Available Commands

### Basic Compilation

```bash
# Compile a file
superjs build --source file.sjs

# Compile with output directory
superjs build --source file.sjs --outDir dist

# Show help
superjs --help

# Show version
superjs --version
```

### Type Checking

```bash
# Type check without compilation
superjs check --source file.sjs

# Type check with detailed output
superjs check --source file.sjs --verbose
```

## Supported Features (Alpha)

### Type System

- ✅ Basic type annotations
- ✅ Interface definitions
- ✅ Function type checking
- ✅ Variable type inference
- ✅ Array and object types
- ⏳ Generic types (planned)
- ⏳ Union types (planned)
- ⏳ Type aliases (planned)

### Language Constructs

- ✅ Variable declarations (`let`, `const`, `var`)
- ✅ Function declarations and expressions
- ✅ Class declarations
- ✅ Interface declarations
- ✅ Import/export statements
- ✅ Basic expressions and statements
- ⏳ Advanced control flow (planned)
- ⏳ Decorators (planned)

### Tooling

- ✅ Basic CLI tool
- ✅ File compilation
- ✅ Type checking
- ✅ Error reporting
- ⏳ Code formatting (planned)
- ⏳ Linting (planned)
- ⏳ Testing framework (planned)

## Known Limitations

### Type System Limitations

- Limited type inference for complex expressions
- No support for conditional types
- Basic error messages without suggestions
- No type narrowing in control flow

### Compiler Limitations

- No source map generation
- Limited error recovery
- No incremental compilation
- Basic performance optimization

### Tooling Limitations

- No development server
- No watch mode
- No configuration file support
- Limited CLI options

## What's Next?

- [Language Reference](/docs/0.0.1/language-reference) - Learn about Super.js syntax and features
- [Examples](/docs/0.0.1/examples) - See practical examples and use cases
- [Type System](/docs/0.0.1/type-system) - Deep dive into the type system
- [Tooling](/docs/0.0.1/tooling) - Learn about built-in tools and configuration

## Version Information

This documentation is for **Super.js 0.0.1** - the initial alpha release. For the latest stable features, check out [version 0.1.0](/docs/0.1.0/intro) or the [current version](/docs/intro).

## Contributing

This alpha release is the foundation for future development. We welcome contributions in the following areas:

- **Type System**: Enhance type inference and checking
- **Compiler**: Improve performance and error handling
- **Tooling**: Add development tools and utilities
- **Documentation**: Improve guides and examples
- **Testing**: Add test coverage and validation

### Getting Started with Development

```bash
# Clone the repository
git clone https://github.com/super-js/super-js.git
cd super-js

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development
npm run dev
``` 