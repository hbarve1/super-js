---
slug: super-js-0-2-0-released
title: Super.js 0.2.0 Released - Enhanced Type System and Tooling
authors: [superjs-team]
tags: [announcement, release, typescript, compiler]
---

# Super.js 0.2.0 Released

We're excited to announce the release of **Super.js 0.2.0**! This release brings significant enhancements to the type system, compiler performance, and developer tooling.

## 🚀 What's New in 0.2.0

### Enhanced Type System

#### Advanced Generic Constraints
Super.js now supports more sophisticated generic constraints, allowing for better type safety in complex scenarios:

```javascript
// Enhanced generic constraints
interface Lengthwise {
  length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
  console.log(arg.length);
  return arg;
}

// Multiple constraints
interface HasId {
  id: number;
}

interface HasName {
  name: string;
}

function processEntity<T extends HasId & HasName>(entity: T): void {
  console.log(`Processing ${entity.name} with ID ${entity.id}`);
}
```

#### Conditional Types
Support for conditional types enables powerful type-level programming:

```javascript
type NonNullable<T> = T extends null | undefined ? never : T;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

// Complex conditional types
type TypeName<T> = T extends string
  ? "string"
  : T extends number
  ? "number"
  : T extends boolean
  ? "boolean"
  : "object";
```

#### Mapped Types
Create new types by transforming existing ones:

```javascript
interface User {
  id: number;
  name: string;
  email: string;
}

// Make all properties optional
type PartialUser = Partial<User>;

// Make all properties read-only
type ReadonlyUser = Readonly<User>;

// Pick specific properties
type UserBasic = Pick<User, "name" | "email">;
```

### Compiler Improvements

#### Source Map Generation
Full source map support for better debugging experience:

```bash
superjs build --source file.sjs --sourcemap
```

#### Incremental Compilation
Faster rebuilds for large projects:

```bash
superjs build --incremental
```

#### Parallel Compilation
Utilize multiple CPU cores for faster compilation:

```bash
superjs build --parallel
```

### Enhanced Tooling

#### Advanced Linting Rules
New linting rules for better code quality:

```bash
# Enable strict rules
superjs lint --rules strict

# Custom rule configuration
superjs lint --config .superjsrc
```

#### Test Coverage Reporting
Built-in test coverage with detailed reports:

```bash
superjs test --coverage --threshold 80
```

#### Performance Profiling
Identify performance bottlenecks in your code:

```bash
superjs build --profile
```

### Language Features

#### Decorator Support (Experimental)
Decorators for class and method enhancement:

```javascript
function log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${propertyKey} with args:`, args);
    const result = method.apply(this, args);
    console.log(`${propertyKey} returned:`, result);
    return result;
  };
}

class Calculator {
  @log
  add(a: number, b: number): number {
    return a + b;
  }
}
```

#### Template Literal Types
Type-safe template literal manipulation:

```javascript
type EventType = "click" | "hover" | "focus";
type HandlerName<T extends EventType> = `on${Capitalize<T>}`;

function createHandler<T extends EventType>(event: T): HandlerName<T> {
  return `on${event.charAt(0).toUpperCase() + event.slice(1)}` as HandlerName<T>;
}

const clickHandler = createHandler("click"); // "onClick"
```

## 🔧 Breaking Changes

### Generic Constraint Syntax
The generic constraint syntax has been updated for better consistency:

```javascript
// Old syntax (deprecated)
function process<T extends HasId>(item: T): void {}

// New syntax
function process<T extends HasId>(item: T): void {}
```

### Decorator Implementation
Decorator behavior has been standardized:

```javascript
// Updated decorator signature
function decorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  // Implementation
}
```

## 📈 Performance Improvements

- **Type checking**: 40% faster for large codebases
- **Compilation**: 60% improvement with parallel compilation
- **Memory usage**: 30% reduction in memory consumption
- **Startup time**: 50% faster CLI startup

## 🛠️ Migration Guide

### Upgrading from 0.1.0

1. **Update Super.js**:
   ```bash
   npm install -g superjs@latest
   ```

2. **Review Generic Constraints**:
   Check your generic constraints for the new syntax requirements.

3. **Test Decorators**:
   If using decorators, review their implementation for compatibility.

4. **Update Configuration**:
   Review your `.superjsrc` configuration for new options.

### New Configuration Options

```json
{
  "compiler": {
    "incremental": true,
    "parallel": true,
    "sourcemap": true
  },
  "test": {
    "coverage": {
      "enabled": true,
      "threshold": 80
    }
  }
}
```

## 🎯 What's Next

### Planned for 0.3.0
- Higher-kinded types
- Dependent types
- Advanced pattern matching
- Enhanced IDE support

### Roadmap to 1.0.0
- Production-ready stability
- Migration tools from TypeScript
- Enterprise features
- Ecosystem integration

## 🙏 Community Contributions

This release includes contributions from our amazing community:

- **@alice**: Enhanced type inference
- **@bob**: Performance optimizations
- **@charlie**: Documentation improvements
- **@diana**: Test framework enhancements

## 📚 Resources

- **Documentation**: [docs.super-js.dev](https://docs.super-js.dev)
- **Changelog**: [docs.super-js.dev/docs/changelog](https://docs.super-js.dev/docs/changelog)
- **GitHub**: [github.com/super-js/super-js](https://github.com/super-js/super-js)
- **Issues**: [github.com/super-js/super-js/issues](https://github.com/super-js/super-js/issues)

## 🚀 Get Started

Install the latest version:

```bash
npm install -g superjs@latest
```

Try the new features:

```bash
# Create a new project
superjs init my-project

# Build with new features
superjs build --incremental --parallel

# Run tests with coverage
superjs test --coverage
```

## 💬 Feedback

We'd love to hear your feedback on this release! Share your thoughts:

- **GitHub Discussions**: [github.com/super-js/super-js/discussions](https://github.com/super-js/super-js/discussions)
- **Twitter**: [@super_js](https://twitter.com/super_js)
- **Discord**: [discord.gg/super-js](https://discord.gg/super-js)

Thank you for being part of the Super.js community! 🎉 