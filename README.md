# Super-JS 🚀

A strict, clean, and efficient superset of JavaScript that enforces ECMA standards with built-in type safety, formatting, linting, and testing capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4.2-blue.svg)](https://www.typescriptlang.org/)

## ✨ Features

- **🔒 Type Safety**: Static type checking with JavaScript-first approach
- **🧠 Smart Type Inference**: Automatic type inference based on ECMA standard patterns
- **🛠️ Built-in Tooling**: Integrated formatter, linter, and testing framework
- **🌐 Universal Compilation**: Supports both frontend and backend environments
- **⚡ Zero Configuration**: Works out of the box with sensible defaults
- **🚀 Fast Compilation**: Optimized compilation process for quick development cycles
- **🎯 JavaScript Version Targeting**: Target specific JavaScript versions (ES5 to ES2022)
- **⚛️ Native JSX Support**: First-class JSX syntax support without external dependencies
- **🔧 Advanced Type System**: Conditional types, mapped types, and type guards
- **⚡ Performance Optimizations**: Incremental compilation and parallel processing

## 🚀 Quick Start

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

## 📁 File Extension

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

## 🎯 JavaScript Version Targeting

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

**Supported JavaScript versions:**
- es5
- es2015 (ES6)
- es2016
- es2017
- es2018
- es2019
- es2020
- es2021
- es2022 (default)

## 🛠️ Development Workflow

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

## 📚 Examples

### Basic Type Annotations

```javascript
// hello-world.sjs
const message: string = 'Hello, SuperJS!';
const version: number = 0.1;
const isEnabled: boolean = true;

interface Person {
  name: string;
  age: number;
  email?: string;
}

function greet(person: Person): string {
  return `Hello, ${person.name}! You are ${person.age} years old.`;
}
```

### Classes and Interfaces

```javascript
// classes.sjs
interface Vehicle {
  brand: string;
  model: string;
  year: number;
  start(): void;
}

class Car implements Vehicle {
  constructor(
    public brand: string,
    public model: string,
    public year: number
  ) {}

  start(): void {
    console.log(`${this.brand} ${this.model} is starting...`);
  }
}
```

### Generics

```javascript
// generics.sjs
interface Repository<T> {
  find(id: number): T | null;
  save(item: T): void;
  delete(id: number): boolean;
  findAll(): T[];
}

class UserRepository implements Repository<User> {
  private users: User[] = [];

  find(id: number): User | null {
    return this.users.find(user => user.id === id) || null;
  }

  save(user: User): void {
    const existingIndex = this.users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      this.users[existingIndex] = user;
    } else {
      this.users.push(user);
    }
  }
}
```

## 🏗️ Project Structure

```
super-js/
├── compiler/          # JavaScript-based compiler implementation
├── docs/             # Documentation site (Docusaurus)
├── examples/         # Example Super.js files
├── llvm/            # LLVM-based compiler implementation
├── prototype/       # TypeScript-based prototype implementation
└── README.md
```

## 📖 Documentation

- **[Language Reference](/docs/language-reference)** - Learn about Super.js syntax and features
- **[Examples](/docs/examples)** - See practical examples and use cases
- **[Type System](/docs/type-system)** - Deep dive into the type system
- **[Tooling](/docs/tooling)** - Learn about built-in tools and configuration

## 🔧 Development

### Prerequisites

- Node.js >= 14.0.0
- npm or yarn

### Building from source

```bash
git clone https://github.com/your-username/super-js.git
cd super-js
npm install
npm run build
```

### Running tests

```bash
npm test
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📞 Support

- 📧 Email: support@superjs.dev
- 💬 Discord: [Join our community](https://discord.gg/superjs)
- 📖 Documentation: [docs.superjs.dev](https://docs.superjs.dev)
- 🐛 Issues: [GitHub Issues](https://github.com/hbarve1/super-js/issues)

## 🙏 Acknowledgments

- Built with ❤️ by the Super.js team
- Inspired by TypeScript and modern JavaScript development practices
- Thanks to all our contributors and the open-source community

---

**Super-JS** - Making JavaScript development safer, faster, and more enjoyable! 🚀
