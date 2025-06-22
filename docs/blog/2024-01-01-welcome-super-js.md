---
slug: welcome-super-js
title: Welcome to Super.js - A Type-Safe JavaScript Superset
authors: [hbarve1]
tags: [announcement, typescript, javascript, compiler]
---

# Welcome to Super.js

We're excited to announce **Super.js**, a strict, clean, and efficient superset of JavaScript that enforces ECMA standards with built-in type safety, formatting, linting, and testing capabilities.

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

## Why Super.js?

JavaScript has evolved significantly over the years, but many developers still struggle with:

1. **Type Safety**: Runtime errors that could be caught at compile time
2. **Tooling Fragmentation**: Multiple tools for formatting, linting, and testing
3. **Configuration Overhead**: Complex setup processes for new projects
4. **ECMA Compliance**: Ensuring code follows standards without additional features

Super.js addresses these challenges by providing:

- **Unified Tooling**: One tool for compilation, formatting, linting, and testing
- **Zero Configuration**: Sensible defaults that work out of the box
- **ECMA Compliance**: Strict adherence to JavaScript standards
- **Type Safety**: Catch errors before they reach production

## Getting Started

### Installation

```bash
npm install -g superjs
```

### Your First Super.js File

Create a file with the `.sjs` extension:

```javascript
// hello.sjs
function greet(name: string): string {
  return `Hello, ${name}!`;
}

const message = greet("World");
console.log(message);
```

### Compiling and Running

```bash
# Compile the file
superjs build --source hello.sjs

# Run the compiled JavaScript
node hello.js
```

## Language Features

### Type Annotations

```javascript
interface User {
  id: number;
  name: string;
  email: string;
  age?: number; // Optional property
}

class UserAccount {
  constructor(public user: User) {}
  
  updateEmail(newEmail: string): void {
    this.user.email = newEmail;
  }
}
```

### Type Inference

```javascript
// Super.js automatically infers types
const numbers = [1, 2, 3]; // number[]
const user = {
  name: "John",
  age: 30
}; // { name: string, age: number }
```

### Generics

```javascript
function identity<T>(arg: T): T {
  return arg;
}

class Stack<T> {
  private items: T[] = [];
  
  push(item: T): void {
    this.items.push(item);
  }
  
  pop(): T | undefined {
    return this.items.pop();
  }
}
```

## Built-in Tooling

### Formatter

```bash
# Format your code
superjs format file.sjs
```

### Linter

```bash
# Lint your code
superjs lint file.sjs
```

### Testing

```javascript
// math.test.sjs
import { describe, it, expect } from 'superjs/test';
import { add } from './math.sjs';

describe('Math functions', () => {
  it('should add two numbers correctly', () => {
    expect(add(2, 3)).toBe(5);
  });
});
```

```bash
# Run tests
superjs test
```

## JavaScript Version Targeting

Super.js supports targeting specific JavaScript versions:

```bash
# Target ES5 (for older browsers)
superjs build --source file.sjs --target es5

# Target ES2020
superjs build --source file.sjs --target es2020

# Default (ES2022)
superjs build --source file.sjs
```

## Project Structure

The Super.js project consists of multiple implementations:

- **prototype/**: TypeScript implementation with full feature set
- **compiler/**: JavaScript implementation focusing on core compiler features
- **llvm/**: C++ implementation using LLVM for high performance
- **examples/**: Comprehensive examples and use cases
- **docs/**: Project documentation (this site)

## What's Next?

We're actively developing Super.js and have an exciting roadmap ahead:

1. **Enhanced Type System**: Advanced type features and better inference
2. **Performance Optimizations**: Faster compilation and better runtime performance
3. **IDE Integration**: Better editor support and developer experience
4. **Ecosystem Tools**: Package manager, dependency management, and more
5. **Community**: Documentation, examples, and community contributions

## Get Involved

We believe in building Super.js as a community-driven project. Here's how you can get involved:

- **Try it out**: Install Super.js and experiment with the language
- **Report issues**: Help us improve by reporting bugs and suggesting features
- **Contribute code**: Submit pull requests and help with development
- **Share feedback**: Let us know what you think and how we can improve
- **Spread the word**: Tell other developers about Super.js

## Resources

- **Documentation**: [superjs.org](https://superjs.org)
- **GitHub**: [github.com/hbarve1/superjs](https://github.com/hbarve1/superjs)
- **Examples**: [github.com/hbarve1/superjs/tree/main/examples](https://github.com/hbarve1/superjs/tree/main/examples)
- **Discussions**: [github.com/hbarve1/superjs/discussions](https://github.com/hbarve1/superjs/discussions)

## Conclusion

Super.js represents our vision for a better JavaScript development experience. We're combining the power of static typing with the simplicity and flexibility of JavaScript, all while maintaining strict ECMA compliance.

We're excited to see what you'll build with Super.js and look forward to your feedback and contributions. Together, we can make JavaScript development more productive, safer, and more enjoyable.

Welcome to the Super.js community! 🚀 
