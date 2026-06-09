# super.js Language Specification

## 1. Introduction

super.js is a JavaScript superset that strictly adheres to ECMA standards while providing integrated development tools and type safety. This document outlines the technical specifications of the language.

## 2. Language Features

### 2.1 JavaScript Compatibility
- Full compatibility with ECMAScript latest specification
- Type annotations that compile away to standard JavaScript
- Strict mode enforced by default

### 2.2 Type System
- Static type checking
- Type inference
- Generics support
- Union and intersection types
- Literal types
- Type guards
- Mapped types
- Conditional types
- Type assertions
- Declaration merging

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
```

#### 2.2.2 Interfaces and Types
```javascript
// Interface declaration
interface User {
  name: string;
  age: number;
  email?: string;
  readonly id: number;
}

// Type aliases
type StringOrNumber = string | number;
type UserCallback = (user: User) => void;

// Generic interfaces
interface List<T> {
  items: T[];
  add(item: T): void;
  remove(item: T): boolean;
}
```

#### 2.2.3 Type Inference
```javascript
// Automatic type inference
let name = "John"; // inferred as string
let age = 30; // inferred as number
let items = [1, "two", true]; // inferred as (string | number | boolean)[]

// Function return type inference
function double(x: number) { // return type inferred as number
  return x * 2;
}
```

### 2.3 File Format
- Extension: `.sjs`
- UTF-8 encoding
- Line endings: LF (Unix-style) preferred

### 2.4 Module System
- Native ES Modules support
- CommonJS support for backward compatibility
- Dynamic imports supported
- Type-aware module resolution

### 2.5 Module System
- Native ES Modules support
- CommonJS support for backward compatibility
- Dynamic imports supported

## 3. Built-in Tools

### 3.1 Formatter
- Automatic code formatting
- Based on ECMA style guidelines
- Configurable through `super.config.js`
- Default rules:
  - 80 characters line length
  - 2 spaces indentation
  - Semicolons required
  - Single quotes for strings
  - Trailing commas in multiline

### 3.2 Linter
- Static code analysis
- ECMA standards enforcement
- Built-in rules:
  - No unused variables
  - No implicit globals
  - No undefined references
  - Proper error handling
  - Consistent return statements
  - Array method callbacks
  - Promise handling

### 3.3 Testing Framework
- Jest-compatible API
- Built-in test runner
- Features:
  - Describe/It syntax
  - Async testing
  - Mocking capabilities
  - Code coverage
  - Snapshot testing
  - Watch mode

## 4. Compilation

### 4.1 Compilation Targets
- Browser (ES5+)
- Node.js
- WebWorkers
- Service Workers

### 4.2 Compilation Process
1. Parse source files
2. Apply linting rules
3. Format code
4. Generate source maps
5. Output compiled code

### 4.3 Build Optimization
- Dead code elimination
- Module concatenation
- Minification options
- Source map generation
- Asset optimization

## 5. Project Structure

```
project/
├── src/
│   └── *.sjs
├── tests/
│   └── *.test.sjs
├── super.config.js
├── package.json
└── README.md
```

## 6. Configuration

### 6.1 super.config.js Options

```javascript
{
  target: 'node' | 'web',
  format: {
    printWidth: number,
    tabWidth: number,
    semi: boolean,
    singleQuote: boolean,
    trailingComma: 'none' | 'es5' | 'all'
  },
  types: {
    strict: boolean,
    noImplicitAny: boolean,
    strictNullChecks: boolean,
    strictFunctionTypes: boolean,
    strictBindCallApply: boolean,
    strictPropertyInitialization: boolean,
    noImplicitThis: boolean,
    alwaysStrict: boolean,
    checkJs: boolean,
    allowJs: boolean,
    declaration: boolean,
    declarationMap: boolean
  },
  lint: {
    rules: {
      // ECMA standard rules
    }
  },
  test: {
    coverage: boolean,
    testMatch: string[],
    setupFiles: string[]
  },
  build: {
    outDir: string,
    sourceMaps: boolean,
    minify: boolean,
    declaration: boolean
  }
}
```

## 7. Error Handling

### 7.1 Compilation Errors
- Syntax errors
- ECMA standard violations
- Module resolution errors
- Configuration errors

### 7.2 Runtime Errors
- Standard JavaScript errors
- Enhanced stack traces
- Source map integration

## 8. Performance

### 8.1 Compilation Performance
- Incremental compilation
- Caching mechanisms
- Parallel processing
- Memory efficient

### 8.2 Runtime Performance
- No runtime overhead
- Native JavaScript performance
- Optimized output

## 9. Security

- No eval() by default
- Strict CSP compatibility
- Secure by default practices
- Dependencies audit

## 10. Future Considerations

- WebAssembly integration
- TypeScript definition generation
- IDE integration
- Plugin system
- Performance profiling tools

## 11. Version Strategy

- Semantic versioning
- LTS support
- Deprecation policy
- Migration tools 