---
sidebar_position: 2
---

# Language Reference

Super.js extends JavaScript with type annotations while maintaining full ECMA compliance. This reference covers the syntax and features available in Super.js.

## Basic Types

Super.js supports all JavaScript types with additional type safety:

```javascript
// Primitive types
let str: string = "hello";
let num: number = 42;
let bool: boolean = true;
let n: null = null;
let u: undefined = undefined;
let sym: symbol = Symbol("key");

// Type inference
let inferredString = "hello"; // type: string
let inferredNumber = 42; // type: number
let inferredArray = [1, 2, 3]; // type: number[]
```

## Type Annotations

### Function Parameters and Return Types

```javascript
function add(a: number, b: number): number {
  return a + b;
}

const multiply = (x: number, y: number): number => x * y;

function greet(name: string, greeting: string = "Hello"): string {
  return `${greeting}, ${name}!`;
}
```

### Variable Declarations

```javascript
let message: string = "Hello World";
const PI: number = 3.14159;
var count: number = 0;
```

## Interfaces

Define object shapes and contracts:

```javascript
interface User {
  id: number;
  name: string;
  email: string;
  age?: number; // Optional property
  readonly createdAt: Date; // Read-only property
}

interface Config {
  [key: string]: any; // Index signature
}

// Interface extension
interface AdminUser extends User {
  permissions: string[];
  isActive: boolean;
}
```

## Classes

Object-oriented programming with type safety:

```javascript
class Person {
  // Public properties
  name: string;
  age: number;
  
  // Private properties
  #email: string;
  
  // Protected properties
  protected id: number;
  
  constructor(name: string, age: number, email: string) {
    this.name = name;
    this.age = age;
    this.#email = email;
    this.id = Math.random();
  }
  
  // Public method
  greet(): string {
    return `Hello, I'm ${this.name}`;
  }
  
  // Private method
  #validateEmail(email: string): boolean {
    return email.includes('@');
  }
  
  // Static method
  static create(name: string, age: number, email: string): Person {
    return new Person(name, age, email);
  }
}

// Class inheritance
class Employee extends Person {
  department: string;
  
  constructor(name: string, age: number, email: string, department: string) {
    super(name, age, email);
    this.department = department;
  }
  
  getInfo(): string {
    return `${this.greet()} from ${this.department}`;
  }
}
```

## Generics

Type-safe reusable components:

```javascript
// Generic function
function identity<T>(arg: T): T {
  return arg;
}

// Generic interface
interface Container<T> {
  value: T;
  getValue(): T;
  setValue(value: T): void;
}

// Generic class
class Stack<T> {
  private items: T[] = [];
  
  push(item: T): void {
    this.items.push(item);
  }
  
  pop(): T | undefined {
    return this.items.pop();
  }
  
  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }
  
  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

// Usage
const numberStack = new Stack<number>();
const stringStack = new Stack<string>();
```

## Union and Intersection Types

```javascript
// Union types
type StringOrNumber = string | number;
type Status = "pending" | "success" | "error";

function processValue(value: StringOrNumber): string {
  if (typeof value === "string") {
    return value.toUpperCase();
  } else {
    return value.toString();
  }
}

// Intersection types
interface HasName {
  name: string;
}

interface HasAge {
  age: number;
}

type Person = HasName & HasAge;

const person: Person = {
  name: "John",
  age: 30
};
```

## Type Aliases

Create custom type names:

```javascript
type Point = {
  x: number;
  y: number;
};

type ID = string | number;

type Callback<T> = (value: T) => void;

type AsyncFunction<T> = () => Promise<T>;
```

## Modules and Imports

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

## JSX Support

Native JSX without external dependencies:

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

## Template Literals

Type-safe template literals:

```javascript
type EventType = "click" | "hover" | "focus";

function createHandler(event: EventType) {
  return `on${event.charAt(0).toUpperCase() + event.slice(1)}`;
}

const clickHandler = createHandler("click"); // "onClick"
```

## Async/Await

Full support for asynchronous programming:

```javascript
async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }
  return response.json();
}

async function processUsers(ids: number[]): Promise<User[]> {
  const promises = ids.map(id => fetchUser(id));
  return Promise.all(promises);
}
```

## Type Guards

Runtime type checking:

```javascript
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

function processValue(value: unknown): string {
  if (isString(value)) {
    return value.toUpperCase();
  } else if (isNumber(value)) {
    return value.toString();
  } else {
    return "unknown";
  }
}
```

## Utility Types

Built-in utility types for common transformations:

```javascript
interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
}

// Partial - makes all properties optional
type PartialUser = Partial<User>;

// Required - makes all properties required
type RequiredUser = Required<User>;

// Pick - select specific properties
type UserBasic = Pick<User, "name" | "email">;

// Omit - exclude specific properties
type UserWithoutId = Omit<User, "id">;

// Record - create object type with specific keys
type UserMap = Record<string, User>;
```

## Error Handling

Type-safe error handling:

```javascript
class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function validateUser(user: unknown): user is User {
  if (typeof user !== "object" || user === null) {
    throw new ValidationError("User must be an object", "user");
  }
  
  const u = user as any;
  if (typeof u.name !== "string") {
    throw new ValidationError("Name must be a string", "name");
  }
  
  return true;
}
``` 