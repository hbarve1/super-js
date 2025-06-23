---
sidebar_position: 1
---

# Welcome to Super.js

**Super.js** is a strict, clean, and efficient superset of JavaScript that enforces ECMA standards with built-in type safety, formatting, linting, and testing capabilities.

## What is Super.js?

Super.js extends JavaScript with static type checking while maintaining pure JavaScript semantics. It provides TypeScript-like type safety with a focus on ECMA compliance and zero-configuration development experience.

### Key Features

- **Type Safety**: Static type checking with JavaScript-first approach
- **Type Inference**: Smart type inference based on ECMA standard patterns
- **Built-in Tooling**: Integrated formatter, linter, and testing framework
- **Universal Compilation**: Supports both frontend and backend environments
- **Zero Configuration**: Works out of the box with sensible defaults
- **Fast Compilation**: Optimized compilation process for quick development cycles
- **JavaScript Version Selection**: Target specific JavaScript versions (ES5 to ES2022)
- **Native JSX Support**: First-class JSX syntax support without external dependencies

## Quick Start

### Installation

```bash
npm install -g superjs
```

### Creating a new project

```bash
superjs init my-project
cd my-project
```

### Your first Super.js file

Create a file with the `.sjs` extension:

```javascript
// hello.sjs
function greet(name: string): string {
  return `Hello, ${name}!`;
}

const message = greet("World");
console.log(message);
```

### Compiling and running

```bash
# Compile the file
superjs build --source hello.sjs

# Run the compiled JavaScript
node hello.js
```

## File Extension

Super.js files use the `.sjs` extension and support type annotations:

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

// Type inference
const numbers = [1, 2, 3]; // inferred as number[]
const user = {
  name: "John",
  age: 30
}; // inferred as { name: string, age: number }
```

## JavaScript Version Targeting

You can target specific JavaScript versions using the `--target` option:

```bash
# Target ES5
superjs build --source file.sjs --target es5

# Target ES2015 (ES6)
superjs build --source file.sjs --target es2015

# Target ES2020
superjs build --source file.sjs --target es2020

# Default (ES2022)
superjs build --source file.sjs
```

Supported JavaScript versions:
- es5
- es2015 (ES6)
- es2016
- es2017
- es2018
- es2019
- es2020
- es2021
- es2022 (default)

## Development Workflow

### Development mode with watch

```bash
superjs dev
```

### Running tests

```bash
superjs test
```

### Formatting code

```bash
superjs format
```

### Linting code

```bash
superjs lint
```

## What's Next?

- [Language Reference](/docs/language-reference) - Learn about Super.js syntax and features
- [Examples](/docs/examples) - See practical examples and use cases
- [Type System](/docs/type-system) - Deep dive into the type system
- [Tooling](/docs/tooling) - Learn about built-in tools and configuration
