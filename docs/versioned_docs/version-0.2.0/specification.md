---
sidebar_position: 8
---

# Language Specification

This document outlines the technical specifications of Super.js, a JavaScript superset that strictly adheres to ECMA standards while providing integrated development tools and type safety.

## 1. Introduction

Super.js is a JavaScript superset that extends the language with static type checking while maintaining full ECMA compliance. The language is designed to provide a TypeScript-like developer experience with zero configuration and built-in tooling.

### Design Principles

- **ECMA Compliance**: Full adherence to ECMAScript standards
- **Type Safety**: Static type checking with JavaScript-first approach
- **Zero Configuration**: Works out of the box with sensible defaults
- **Performance**: Fast compilation and type checking
- **Universal Support**: Frontend, backend, and edge computing environments

## 2. Language Features

### 2.1 JavaScript Compatibility

Super.js maintains full compatibility with the latest ECMAScript specification:

- **ECMAScript 2022** as the baseline
- **Backward Compatibility** with ES5+ targets
- **Type Annotations** that compile away to standard JavaScript
- **Strict Mode** enforced by default
- **All JavaScript Features** supported without modification

### 2.2 Type System

Super.js provides a comprehensive type system that extends JavaScript with static type checking:

#### 2.2.1 Basic Types

```javascript
// Primitive types
let str: string = "hello";
let num: number = 42;
let bool: boolean = true;
let nul: null = null;
let undef: undefined = undefined;
let sym: symbol = Symbol("key");
let big: bigint = 42n;

// Complex types
let arr: number[] = [1, 2, 3];
let tup: [string, number] = ["hello", 42];
let obj: object = { key: "value" };
let func: Function = () => {};
let any: any = "anything";
let unknown: unknown = "unknown";
let never: never = (() => { throw new Error(); })();
```

#### 2.2.2 Interfaces and Types

```javascript
// Interface declaration
interface User {
  name: string;
  age: number;
  email?: string; // Optional property
  readonly id: number; // Read-only property
  [key: string]: any; // Index signature
}

// Type aliases
type StringOrNumber = string | number;
type UserCallback = (user: User) => void;
type Point = { x: number; y: number };

// Generic interfaces
interface List<T> {
  items: T[];
  add(item: T): void;
  remove(item: T): boolean;
  get(index: number): T | undefined;
}

// Interface extension
interface AdminUser extends User {
  permissions: string[];
  isActive: boolean;
}
```

#### 2.2.3 Type Inference

```javascript
// Automatic type inference
let name = "John"; // inferred as string
let age = 30; // inferred as number
let items = [1, "two", true]; // inferred as (string | number | boolean)[]
let user = { name: "John", age: 30 }; // inferred as { name: string, age: number }

// Function return type inference
function double(x: number) { // return type inferred as number
  return x * 2;
}

// Contextual type inference
const numbers = [1, 2, 3];
const doubled = numbers.map(n => n * 2); // inferred as number[]
```

#### 2.2.4 Advanced Types

```javascript
// Union types
type Status = "pending" | "success" | "error";
type Shape = Circle | Square | Triangle;

// Intersection types
type Person = HasName & HasAge & HasEmail;

// Conditional types
type NonNullable<T> = T extends null | undefined ? never : T;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

// Mapped types
type Partial<T> = {
  [P in keyof T]?: T[P];
};

type Required<T> = {
  [P in keyof T]-?: T[P];
};

type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};
```

#### 2.2.5 Generics

```javascript
// Generic functions
function identity<T>(arg: T): T {
  return arg;
}

function firstElement<T>(arr: T[]): T | undefined {
  return arr[0];
}

// Generic constraints
interface Lengthwise {
  length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
  console.log(arg.length);
  return arg;
}

// Generic classes
class Stack<T> {
  private items: T[] = [];
  
  push(item: T): void {
    this.items.push(item);
  }
  
  pop(): T | undefined {
    return this.items.pop();
  }
  
  isEmpty(): boolean {
    return this.items.length === 0;
  }
}
```

### 2.3 File Format

- **Extension**: `.sjs` (Super JavaScript)
- **Encoding**: UTF-8
- **Line Endings**: LF (Unix-style) preferred
- **Comments**: Standard JavaScript comment syntax
- **Shebang**: Supported for executable scripts

### 2.4 Module System

Super.js supports multiple module systems:

#### 2.4.1 ES Modules (Default)

```javascript
// Named exports
export function add(a: number, b: number): number {
  return a + b;
}

export const PI = 3.14159;

export interface User {
  name: string;
  email: string;
}

// Default export
export default class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}

// Import statements
import { add, PI, User } from './math';
import Calculator from './calculator';
import * as Utils from './utils';
```

#### 2.4.2 CommonJS Support

```javascript
// CommonJS exports
module.exports = {
  add: function(a, b) { return a + b; },
  PI: 3.14159
};

// CommonJS imports
const { add, PI } = require('./math');
```

#### 2.4.3 Dynamic Imports

```javascript
// Dynamic import support
async function loadModule() {
  const module = await import('./dynamic-module');
  return module.default;
}
```

### 2.5 JSX Support

Native JSX support without external dependencies:

```javascript
interface Props {
  name: string;
  children?: React.ReactNode;
}

function Greeting({ name, children }: Props) {
  return (
    <div className="greeting">
      <h1>Hello, {name}!</h1>
      {children}
    </div>
  );
}

// Usage
const element = <Greeting name="World">Welcome!</Greeting>;
```

## 3. Built-in Tools

### 3.1 Formatter

The Super.js formatter ensures consistent code style:

#### 3.1.1 Default Rules

- **Line Length**: 80 characters
- **Indentation**: 2 spaces
- **Semicolons**: Required
- **Quotes**: Single quotes for strings
- **Trailing Commas**: ES5 compatible
- **Bracket Spacing**: Enabled
- **Arrow Function Parentheses**: Avoid when possible

#### 3.1.2 Configuration

```javascript
// super.config.js
module.exports = {
  format: {
    printWidth: 80,
    tabWidth: 2,
    semi: true,
    singleQuote: true,
    trailingComma: 'es5',
    bracketSpacing: true,
    arrowParens: 'avoid'
  }
};
```

### 3.2 Linter

Static code analysis with ECMA standards enforcement:

#### 3.2.1 Built-in Rules

- **ECMA Standards**: Enforce ECMAScript compliance
- **No Unused Variables**: Detect unused variables and imports
- **No Implicit Globals**: Prevent accidental global variable creation
- **No Undefined References**: Catch undefined variable usage
- **Proper Error Handling**: Ensure errors are handled appropriately
- **Consistent Return Statements**: Enforce consistent return patterns
- **Array Method Callbacks**: Validate array method usage
- **Promise Handling**: Ensure proper promise error handling

#### 3.2.2 Configuration

```javascript
// super.config.js
module.exports = {
  lint: {
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'ecma-version': 2022,
      'source-type': 'module'
    }
  }
};
```

### 3.3 Testing Framework

Jest-compatible testing framework:

#### 3.3.1 Features

- **Describe/It Syntax**: Familiar testing structure
- **Async Testing**: Full async/await support
- **Mocking Capabilities**: Built-in mocking utilities
- **Code Coverage**: Integrated coverage reporting
- **Snapshot Testing**: Component snapshot validation
- **Watch Mode**: Continuous testing during development

#### 3.3.2 Example

```javascript
// math.test.sjs
import { describe, it, expect, beforeEach } from 'superjs/test';
import { Calculator } from './math.sjs';

describe('Calculator', () => {
  let calculator: Calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  it('should add two numbers correctly', () => {
    expect(calculator.add(2, 3)).toBe(5);
    expect(calculator.add(-1, 1)).toBe(0);
  });

  it('should handle edge cases', () => {
    expect(calculator.add(Number.MAX_SAFE_INTEGER, 1))
      .toBeGreaterThan(Number.MAX_SAFE_INTEGER);
  });
});
```

## 4. Compilation

### 4.1 Compilation Targets

Super.js supports multiple compilation targets:

- **Browser**: ES5, ES2015, ES2016, ES2017, ES2018, ES2019, ES2020, ES2021, ES2022
- **Node.js**: All Node.js versions
- **WebWorkers**: Browser worker environments
- **Service Workers**: Progressive web app support

### 4.2 Compilation Process

1. **Parse**: Parse source files into AST
2. **Type Check**: Perform static type checking
3. **Lint**: Apply linting rules
4. **Format**: Apply formatting rules
5. **Transform**: Apply target-specific transformations
6. **Generate**: Output compiled JavaScript
7. **Source Maps**: Generate source maps for debugging

### 4.3 Build Optimization

- **Dead Code Elimination**: Remove unused code
- **Module Concatenation**: Combine modules for smaller bundles
- **Minification**: Optional code minification
- **Source Map Generation**: Full debugging support
- **Asset Optimization**: Optimize imported assets

## 5. Project Structure

Standard Super.js project structure:

```
project/
├── src/
│   ├── index.sjs
│   ├── components/
│   │   └── *.sjs
│   └── utils/
│       └── *.sjs
├── tests/
│   └── *.test.sjs
├── dist/
│   └── compiled output
├── super.config.js
├── package.json
└── README.md
```

## 6. Configuration

### 6.1 super.config.js Options

```javascript
module.exports = {
  // Compiler options
  compiler: {
    target: 'es2022',
    module: 'esnext',
    sourcemap: true,
    outDir: './dist',
    rootDir: './src',
    declaration: false,
    declarationMap: false
  },

  // Type checking options
  types: {
    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    strictFunctionTypes: true,
    strictBindCallApply: true,
    strictPropertyInitialization: true,
    noImplicitThis: true,
    alwaysStrict: true,
    checkJs: false,
    allowJs: false
  },

  // Formatting options
  format: {
    printWidth: 80,
    tabWidth: 2,
    semi: true,
    singleQuote: true,
    trailingComma: 'es5',
    bracketSpacing: true,
    arrowParens: 'avoid'
  },

  // Linting options
  lint: {
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error'
    },
    ecmaVersion: 2022,
    sourceType: 'module'
  },

  // Testing options
  test: {
    coverage: {
      enabled: true,
      threshold: 80,
      exclude: ['node_modules/**', 'dist/**']
    },
    timeout: 5000,
    setupFiles: ['./test-setup.sjs']
  },

  // Build options
  build: {
    outDir: './dist',
    sourceMaps: true,
    minify: false,
    declaration: false
  }
};
```

## 7. Error Handling

### 7.1 Compilation Errors

- **Syntax Errors**: Invalid Super.js syntax
- **Type Errors**: Type checking violations
- **ECMA Standard Violations**: Non-compliant JavaScript
- **Module Resolution Errors**: Import/export issues
- **Configuration Errors**: Invalid configuration

### 7.2 Runtime Errors

- **Standard JavaScript Errors**: All native JavaScript errors
- **Enhanced Stack Traces**: Improved error reporting
- **Source Map Integration**: Accurate error locations
- **Type Assertion Errors**: Runtime type validation failures

## 8. Performance

### 8.1 Compilation Performance

- **Incremental Compilation**: Only recompile changed files
- **Caching Mechanisms**: Persistent compilation cache
- **Parallel Processing**: Multi-threaded compilation
- **Memory Efficient**: Optimized memory usage

### 8.2 Runtime Performance

- **No Runtime Overhead**: Compiled to native JavaScript
- **Native JavaScript Performance**: Same performance as hand-written JS
- **Optimized Output**: Efficient compiled code
- **Tree Shaking**: Dead code elimination

## 9. Security

### 9.1 Security Features

- **No eval() by Default**: Secure by default
- **Strict CSP Compatibility**: Content Security Policy support
- **Secure by Default**: Security-first design
- **Dependencies Audit**: Automatic security scanning

### 9.2 Best Practices

- **Input Validation**: Type-safe input handling
- **Error Handling**: Proper error management
- **Resource Management**: Automatic resource cleanup
- **Access Control**: Type-based access control

## 10. Future Considerations

### 10.1 Planned Features

- **WebAssembly Integration**: Direct WASM compilation
- **TypeScript Definition Generation**: .d.ts file generation
- **Enhanced IDE Integration**: Advanced language server
- **Plugin System**: Extensible architecture
- **Performance Profiling Tools**: Built-in profiling

### 10.2 Research Areas

- **Advanced Type Inference**: Machine learning-based inference
- **Cross-Platform Compilation**: Universal compilation targets
- **Real-time Collaboration**: Multi-user development
- **AI-Powered Assistance**: Intelligent code suggestions

## 11. Version Strategy

### 11.1 Semantic Versioning

Super.js follows [Semantic Versioning](https://semver.org/):

- **Major Releases (X.0.0)**: Breaking changes
- **Minor Releases (0.X.0)**: New features, backward compatible
- **Patch Releases (0.0.X)**: Bug fixes, backward compatible

### 11.2 Support Policy

- **LTS Support**: Long-term support for stable versions
- **Deprecation Policy**: Clear deprecation timelines
- **Migration Tools**: Automated migration assistance
- **Backward Compatibility**: Maintained where possible

## 12. Compliance and Standards

### 12.1 ECMAScript Compliance

- **Full ECMAScript 2022 Support**: Complete feature set
- **Proposal Tracking**: Monitor upcoming ECMAScript proposals
- **Standards Alignment**: Regular updates for new standards
- **Compatibility Testing**: Comprehensive test suite

### 12.2 Web Standards

- **Web Platform APIs**: Full browser API support
- **Node.js Compatibility**: Complete Node.js ecosystem support
- **Module Standards**: ES Modules and CommonJS support
- **Security Standards**: CSP and security best practices

---

This specification defines the complete technical foundation of Super.js, ensuring a robust, performant, and standards-compliant JavaScript superset for modern development. 