---
sidebar_position: 4
---

# Type System

Super.js provides a powerful type system that extends JavaScript with static type checking while maintaining full ECMA compliance. This page covers the type system in detail.

## Type Inference

Super.js uses intelligent type inference to automatically determine types based on context:

```javascript
// Automatic type inference
const message = "Hello World"; // string
const count = 42; // number
const isActive = true; // boolean
const items = [1, 2, 3]; // number[]
const user = { name: "John", age: 30 }; // { name: string, age: number }

// Function return type inference
function add(a: number, b: number) {
  return a + b; // return type inferred as number
}

// Array type inference
const mixed = [1, "hello", true]; // (number | string | boolean)[]
const numbers = [1, 2, 3] as const; // readonly [1, 2, 3]
```

## Basic Types

### Primitive Types

```javascript
// All JavaScript primitive types are supported
let str: string = "hello";
let num: number = 42;
let bool: boolean = true;
let n: null = null;
let u: undefined = undefined;
let sym: symbol = Symbol("key");
let big: bigint = 123n;
```

### Object Types

```javascript
// Object type annotation
let obj: object = { x: 10, y: 20 };

// Array types
let numbers: number[] = [1, 2, 3];
let strings: Array<string> = ["a", "b", "c"];
let matrix: number[][] = [[1, 2], [3, 4]];

// Tuple types
let tuple: [string, number] = ["hello", 10];
let optionalTuple: [string, number?] = ["hello"]; // second element optional
let restTuple: [string, ...number[]] = ["hello", 1, 2, 3];
```

## Interface System

### Basic Interfaces

```javascript
interface User {
  id: number;
  name: string;
  email: string;
  age?: number; // Optional property
  readonly createdAt: Date; // Read-only property
}

// Interface implementation
class UserAccount implements User {
  constructor(
    public id: number,
    public name: string,
    public email: string,
    public age?: number
  ) {
    this.createdAt = new Date();
  }
  
  readonly createdAt: Date;
}
```

### Interface Extensions

```javascript
interface Animal {
  name: string;
  makeSound(): string;
}

interface Dog extends Animal {
  breed: string;
  bark(): string;
}

interface Cat extends Animal {
  color: string;
  purr(): string;
}

// Multiple interface extension
interface Pet extends Dog, Cat {
  owner: string;
}
```

### Index Signatures

```javascript
interface StringArray {
  [index: number]: string;
}

interface Dictionary {
  [key: string]: any;
}

interface NumberDictionary {
  [key: string]: number;
  length: number; // Required property
  name: string; // Error: string not assignable to number
}
```

## Advanced Types

### Union Types

```javascript
type StringOrNumber = string | number;
type Status = "pending" | "success" | "error";
type Shape = Circle | Square | Triangle;

function processValue(value: StringOrNumber): string {
  if (typeof value === "string") {
    return value.toUpperCase();
  } else {
    return value.toString();
  }
}

// Discriminated unions
interface Circle {
  kind: "circle";
  radius: number;
}

interface Square {
  kind: "square";
  sideLength: number;
}

type Shape = Circle | Square;

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.sideLength ** 2;
  }
}
```

### Intersection Types

```javascript
interface HasName {
  name: string;
}

interface HasAge {
  age: number;
}

interface HasEmail {
  email: string;
}

type Person = HasName & HasAge;
type Contact = HasName & HasEmail;
type FullProfile = HasName & HasAge & HasEmail;

// Function intersection
type Callable = {
  (): string;
  (x: number): string;
};

type Describable = {
  description: string;
};

type CallableAndDescribable = Callable & Describable;
```

### Conditional Types

```javascript
type NonNullable<T> = T extends null | undefined ? never : T;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;
type InstanceType<T> = T extends new (...args: any[]) => infer R ? R : any;

// Conditional type with multiple conditions
type TypeName<T> = T extends string
  ? "string"
  : T extends number
  ? "number"
  : T extends boolean
  ? "boolean"
  : T extends undefined
  ? "undefined"
  : T extends Function
  ? "function"
  : "object";
```

### Mapped Types

```javascript
// Make all properties optional
type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Make all properties required
type Required<T> = {
  [P in keyof T]-?: T[P];
};

// Make all properties read-only
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

// Pick specific properties
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Omit specific properties
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
```

## Generic Types

### Generic Functions

```javascript
function identity<T>(arg: T): T {
  return arg;
}

function firstElement<T>(arr: T[]): T | undefined {
  return arr[0];
}

function merge<T, U>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}

// Generic constraints
interface Lengthwise {
  length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
  console.log(arg.length);
  return arg;
}
```

### Generic Interfaces

```javascript
interface Repository<T> {
  find(id: number): T | null;
  save(item: T): void;
  delete(id: number): boolean;
  findAll(): T[];
}

interface Cache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(): void;
}
```

### Generic Classes

```javascript
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
  
  size(): number {
    return this.items.length;
  }
}

// Generic class with constraints
class NumberStack<T extends number> extends Stack<T> {
  sum(): number {
    return this.items.reduce((acc, item) => acc + item, 0);
  }
}
```

## Type Guards

### Built-in Type Guards

```javascript
function processValue(value: unknown): string {
  if (typeof value === "string") {
    return value.toUpperCase();
  } else if (typeof value === "number") {
    return value.toString();
  } else if (typeof value === "boolean") {
    return value ? "true" : "false";
  } else if (value === null) {
    return "null";
  } else if (value === undefined) {
    return "undefined";
  } else if (Array.isArray(value)) {
    return value.join(", ");
  } else if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return "unknown";
}
```

### Custom Type Guards

```javascript
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "email" in value
  );
}

// Usage
function processUserData(data: unknown): User | null {
  if (isUser(data)) {
    return data; // Type is narrowed to User
  }
  return null;
}
```

## Utility Types

### Built-in Utility Types

```javascript
interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
  readonly createdAt: Date;
}

// Partial - makes all properties optional
type PartialUser = Partial<User>;

// Required - makes all properties required
type RequiredUser = Required<User>;

// Readonly - makes all properties read-only
type ReadonlyUser = Readonly<User>;

// Pick - select specific properties
type UserBasic = Pick<User, "name" | "email">;

// Omit - exclude specific properties
type UserWithoutId = Omit<User, "id">;

// Record - create object type with specific keys
type UserMap = Record<string, User>;

// Exclude - exclude types from union
type NonNullableUser = Exclude<User | null | undefined, null | undefined>;

// Extract - extract types from union
type StringOrNumber = string | number;
type OnlyString = Extract<StringOrNumber, string>;

// ReturnType - get return type of function
type AddReturnType = ReturnType<typeof add>;

// Parameters - get parameter types of function
type AddParameters = Parameters<typeof add>;

// InstanceType - get instance type of class
type UserInstance = InstanceType<typeof UserAccount>;
```

### Custom Utility Types

```javascript
// Deep partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Deep readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Function type utilities
type AsyncFunction<T> = () => Promise<T>;
type Callback<T> = (value: T) => void;
type EventHandler<T> = (event: T) => void;

// Object type utilities
type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

type OptionalKeys<T> = KeysOfType<T, undefined>;
type RequiredKeys<T> = Exclude<keyof T, OptionalKeys<T>>;
```

## Type Assertions

### Type Assertion Syntax

```javascript
// Angle-bracket syntax
let someValue: unknown = "this is a string";
let strLength: number = (<string>someValue).length;

// As syntax (preferred)
let strLength2: number = (someValue as string).length;

// Const assertions
const colors = ["red", "green", "blue"] as const;
type Color = typeof colors[number]; // "red" | "green" | "blue"

// Type assertion functions
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("Value is not a string");
  }
}

function assertIsNumber(value: unknown): asserts value is number {
  if (typeof value !== "number") {
    throw new Error("Value is not a number");
  }
}
```

## Type Compatibility

### Structural Typing

```javascript
interface Point {
  x: number;
  y: number;
}

interface NamedPoint {
  x: number;
  y: number;
  name: string;
}

let point: Point = { x: 1, y: 2 };
let namedPoint: NamedPoint = { x: 1, y: 2, name: "origin" };

// NamedPoint is compatible with Point (has all required properties)
point = namedPoint; // OK

// Point is not compatible with NamedPoint (missing name property)
// namedPoint = point; // Error
```

### Function Type Compatibility

```javascript
// Parameter compatibility (contravariant)
interface Callback {
  (x: number): void;
}

let callback: Callback = (x: number | string) => console.log(x); // Error
let callback2: Callback = (x: number) => console.log(x); // OK

// Return type compatibility (covariant)
interface Factory {
  (): number;
}

let factory: Factory = () => "hello"; // Error
let factory2: Factory = () => 42; // OK
```

This comprehensive type system provides the foundation for building robust, type-safe applications with Super.js while maintaining full JavaScript compatibility. 