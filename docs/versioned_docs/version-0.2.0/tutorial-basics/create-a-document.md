---
sidebar_position: 2
---

# Create Your First Super.js Document

This tutorial will guide you through creating your first Super.js document and understanding the basic workflow.

## Prerequisites

Before you start, make sure you have:

- [Node.js](https://nodejs.org/) version 14.0 or above installed
- Basic knowledge of JavaScript
- A code editor (VS Code recommended)

## Installation

First, install Super.js globally:

```bash
npm install -g superjs
```

## Creating Your First Super.js File

### Step 1: Create a new file

Create a new file with the `.sjs` extension:

```bash
touch hello.sjs
```

### Step 2: Add some code

Open the file in your editor and add the following code:

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

### Step 3: Compile the file

Run the Super.js compiler:

```bash
superjs build --source hello.sjs
```

This will create a `hello.js` file in the same directory.

### Step 4: Run the compiled JavaScript

```bash
node hello.js
```

You should see the output: `Hello, World!`

## Understanding the Code

Let's break down what we just wrote:

### Interface Definition

```javascript
interface Greeting {
  message: string;
  recipient: string;
}
```

This defines a type structure for greeting objects. It ensures that any object of type `Greeting` must have a `message` property of type `string` and a `recipient` property of type `string`.

### Function with Type Annotations

```javascript
function createGreeting(recipient: string): Greeting {
  return {
    message: "Hello",
    recipient: recipient
  };
}
```

- `recipient: string` - The parameter is typed as a string
- `: Greeting` - The return type is specified as our `Greeting` interface
- The function returns an object that matches the `Greeting` interface

### Type-Safe Function

```javascript
function formatGreeting(greeting: Greeting): string {
  return `${greeting.message}, ${greeting.recipient}!`;
}
```

This function takes a `Greeting` object and returns a formatted string. The type system ensures we can only pass valid `Greeting` objects.

## Adding More Features

Let's enhance our example with more Super.js features:

```javascript
// enhanced-hello.sjs
interface User {
  name: string;
  age?: number; // Optional property
  email: string;
}

class GreetingService {
  private defaultMessage: string = "Hello";
  
  constructor(private users: User[] = []) {}
  
  addUser(user: User): void {
    this.users.push(user);
  }
  
  greetUser(userName: string): string {
    const user = this.users.find(u => u.name === userName);
    if (!user) {
      throw new Error(`User ${userName} not found`);
    }
    
    const ageInfo = user.age ? ` (age ${user.age})` : '';
    return `${this.defaultMessage}, ${user.name}${ageInfo}!`;
  }
  
  greetAll(): string[] {
    return this.users.map(user => this.greetUser(user.name));
  }
}

// Usage
const service = new GreetingService();

service.addUser({ name: "Alice", age: 30, email: "alice@example.com" });
service.addUser({ name: "Bob", email: "bob@example.com" });

console.log(service.greetUser("Alice")); // "Hello, Alice (age 30)!"
console.log(service.greetUser("Bob")); // "Hello, Bob!"

const allGreetings = service.greetAll();
console.log(allGreetings);
```

## Compilation Options

### Target Different JavaScript Versions

```bash
# Target ES5 (for older browsers)
superjs build --source enhanced-hello.sjs --target es5

# Target ES2015 (ES6)
superjs build --source enhanced-hello.sjs --target es2015

# Target ES2020
superjs build --source enhanced-hello.sjs --target es2020
```

### Generate Source Maps

```bash
superjs build --source enhanced-hello.sjs --sourcemap
```

### Specify Output Directory

```bash
superjs build --source enhanced-hello.sjs --outDir dist
```

## Using Built-in Tools

### Formatting

```bash
superjs format enhanced-hello.sjs
```

### Linting

```bash
superjs lint enhanced-hello.sjs
```

### Testing

Create a test file `enhanced-hello.test.sjs`:

```javascript
import { describe, it, expect } from 'superjs/test';
import { GreetingService } from './enhanced-hello.sjs';

describe('GreetingService', () => {
  it('should greet a user correctly', () => {
    const service = new GreetingService();
    service.addUser({ name: "Test", email: "test@example.com" });
    
    expect(service.greetUser("Test")).toBe("Hello, Test!");
  });
  
  it('should include age when available', () => {
    const service = new GreetingService();
    service.addUser({ name: "Test", age: 25, email: "test@example.com" });
    
    expect(service.greetUser("Test")).toBe("Hello, Test (age 25)!");
  });
});
```

Run the tests:

```bash
superjs test
```

## Next Steps

Now that you've created your first Super.js document, you can:

1. **Explore the Language Reference** - Learn about all available syntax and features
2. **Check out Examples** - See more complex examples and patterns
3. **Read about the Type System** - Deep dive into type safety features
4. **Learn about Tooling** - Master the built-in development tools

## Common Issues and Solutions

### Type Errors

If you see type errors, make sure:
- All variables have proper type annotations
- Function parameters and return types are specified
- Interface implementations match the interface definition

### Compilation Errors

Common compilation issues:
- Missing file extensions (use `.sjs`)
- Incorrect import paths
- Syntax errors in type annotations

### Runtime Errors

If the compiled JavaScript doesn't work:
- Check that the target JavaScript version is compatible with your runtime
- Verify that all dependencies are available
- Ensure the compiled code is being executed in the correct environment

Congratulations! You've successfully created your first Super.js document and learned the basics of the language. Keep experimenting and building more complex applications!
