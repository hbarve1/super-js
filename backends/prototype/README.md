> **Legacy:** This is the Phase 1 Babel-based prototype. It is feature-complete and serves as a reference implementation. Active development has moved to `packages/` (Phase 2 custom compiler). See the top-level README for details.

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
- **JavaScript Version Selection**: Target specific JavaScript versions (ES5 to ES2022)
- **Native JSX Support**: First-class JSX syntax support without external dependencies

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

### Development with ts-node

For rapid development, you can use ts-node to run the compiler directly without building:

```bash
# Start the compiler in development mode
npm run start:dev

# Run with file watching (auto-reload)
npm run watch:dev

# Compile a single file
npm run compile -- path/to/your/file.sjs

# Compile a single file with watch mode
npm run compile:watch -- path/to/your/file.sjs

# Compile a single file targeting a specific JavaScript version
npm run compile -- path/to/your/file.sjs --target es2020

# Compile all files in a directory
npm run compile:dir -- ./src

# Compile all files in the project
npm run compile:all

# Compile all example files
npm run compile:examples

# Watch and compile files in a directory
npm run compile:watch:dir -- ./src
```

### JavaScript Version Selection

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

The compiler will automatically transform modern JavaScript features to be compatible with the target version while maintaining the same functionality.

### Directory Structure Example

```
project/
├── src/
│   ├── models/
│   │   └── user.sjs
│   ├── utils/
│   │   └── helpers.sjs
│   └── index.sjs
└── dist/
    ├── models/
    │   └── user.js
    ├── utils/
    │   └── helpers.js
    └── index.js
```

To compile the above structure:
```bash
# Compile everything
npm run compile:all

# Compile just the src directory
npm run compile:dir -- ./src

# Compile a specific subdirectory
npm run compile:dir -- ./src/models
```

### Production Build

For production use, build the compiler first:

```bash
npm run build
```

Then run the compiled version:

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

## Development Setup

### Prerequisites

- Node.js >= 14.0.0
- npm >= 6.0.0

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/your-org/super-js.git
cd super-js
```

2. Install dependencies:
```bash
npm install
```

3. Start development:
```bash
# Using ts-node (recommended for development)
npm run start:dev

# Or with file watching
npm run watch:dev
```

4. Build for production:
```bash
npm run build
```

### Development Scripts

- `npm run start:dev` - Run compiler directly using ts-node
- `npm run watch:dev` - Run compiler with auto-reload on changes
- `npm run compile` - Compile a specific file using ts-node
- `npm run compile:watch` - Watch and compile a specific file
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run linter
- `npm run format` - Format code 

## Build System

super.js comes with a powerful and flexible build system that supports:

- Parallel compilation
- Source maps
- Incremental builds
- Custom output organization
- Build caching
- Watch mode

For detailed information about the build system, configuration options, and best practices, see [Build Documentation](docs/BUILD.md).

### Quick Start

```bash
# Compile a single file
npm run run:file path/to/file.sjs

# Compile a directory
npm run run:dir path/to/directory

# Watch mode
npm run build:watch

# Clean and rebuild
npm run build:clean
```

### JSX Support

super.js includes native support for JSX syntax, allowing you to write HTML-like code directly in your .sjs files without any external dependencies:

```javascript
// counter.sjs
interface CounterProps {
  initialCount: number;
}

function Counter({ initialCount }: CounterProps) {
  let count = initialCount;
  
  function increment() {
    count++;
    sjs.render(<Counter initialCount={count} />, document.getElementById('app'));
  }

  return (
    <div className="counter">
      <h1>Counter</h1>
      <p>Current count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}

// Using fragments for multiple elements
function App() {
  return (
    <>
      <h1>My App</h1>
      <Counter initialCount={0} />
    </>
  );
}

// Render to DOM
sjs.render(<App />, document.getElementById('app'));

// Convert to string (for server-side rendering)
const html = <App />.toString();
```

The JSX syntax in super.js is transformed into native JavaScript using our built-in `sjs` runtime. This means you don't need React or any other framework to use JSX. The runtime provides:

- `sjs.createElement`: Creates virtual DOM nodes
- `sjs.Fragment`: Supports fragment syntax (`<>...</>`)
- `sjs.render`: Renders nodes to the DOM
- String serialization via `.toString()` for server-side rendering

Features supported out of the box:
- Component composition
- Event handling
- Props with type checking
- Children
- Fragments
- Server-side rendering
- Conditional rendering
- Lists and keys
- DOM attributes and properties
- Custom components
- TypeScript integration

Example with more features:

```javascript
// app.sjs
interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

interface TodoListProps {
  items: TodoItem[];
  onToggle: (id: number) => void;
}

function TodoList({ items, onToggle }: TodoListProps) {
  return (
    <ul className="todo-list">
      {items.map(item => (
        <li key={item.id} className={item.done ? 'done' : ''}>
          <label>
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => onToggle(item.id)}
            />
            {item.text}
          </label>
        </li>
      ))}
    </ul>
  );
}

function TodoApp() {
  const [items, setItems] = useState<TodoItem[]>([
    { id: 1, text: 'Learn super.js', done: false },
    { id: 2, text: 'Build something cool', done: false }
  ]);

  function toggleItem(id: number) {
    setItems(items.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    ));
  }

  return (
    <div className="todo-app">
      <h1>Todo List</h1>
      <TodoList items={items} onToggle={toggleItem} />
    </div>
  );
}
```

You can customize the JSX transformation using command-line options:

```bash
# Use custom JSX factory function
superjs build --source app.sjs --jsx-pragma createNode

# Use custom fragment component
superjs build --source app.sjs --jsx-fragment-pragma EmptyWrapper
```

By default, super.js uses:
- `sjs.createElement` as the JSX factory
- `sjs.Fragment` as the fragment component

This provides a lightweight, framework-agnostic way to use JSX in your applications. You can also integrate it with other frameworks if desired.
