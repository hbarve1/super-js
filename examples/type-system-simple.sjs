/**
 * SuperJS Type System Examples (Simplified)
 * 
 * This file demonstrates the core type system features of SuperJS.
 */

// Basic Type Annotations
// ---------------------

// Primitive types
let name: string = "SuperJS";
let age: number = 1;
let isActive: boolean = true;
let nothing: null = null;
let notDefined: undefined = undefined;

// Object types
let point: { x: number; y: number } = { x: 10, y: 20 };
let config: { debug: boolean; timeout: number } = { debug: true, timeout: 1000 };

// Array types
let numbers: number[] = [1, 2, 3, 4, 5];
let names: Array<string> = ["Alice", "Bob", "Charlie"];
let mixed: (string | number)[] = [1, "two", 3, "four"];

// Tuple types
let pair: [string, number] = ["position", 42];
let rgb: [number, number, number] = [255, 128, 0];

// Function types
let greet: (name: string) => string;
greet = (name) => `Hello, ${name}!`;

// Special Types
// ------------

// any - opt out of type checking
let anything: any = 4;
anything = "string"; // No error
anything = { flexible: true }; // No error

// unknown - type-safe alternative to any
let something: unknown = "Hello";
// Need type checking before using unknown values
if (typeof something === "string") {
  console.log(something.toUpperCase());
}

// void - for functions with no return value
function logMessage(message: string): void {
  console.log(message);
}

// Interfaces
interface User {
  id: number;
  name: string;
  email: string;
  age?: number; // Optional property
}

// Interface implementation
const alice: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com"
};

// Interface with methods
interface Calculator {
  add(a: number, b: number): number;
  subtract(a: number, b: number): number;
}

const calc: Calculator = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b
};

// Classes with interfaces
class Employee implements User {
  id: number;
  name: string;
  email: string;
  department: string;

  constructor(id: number, name: string, email: string, department: string) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.department = department;
  }
}

// Type Aliases
type ID = string | number;
type Point = { x: number; y: number };
type Callback = (data: any) => void;

// Union Types
type Status = "pending" | "approved" | "rejected";
let currentStatus: Status = "pending";

// String literal types
type Direction = "north" | "south" | "east" | "west";
let heading: Direction = "north";

// Numeric literal types
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;
let roll: DiceRoll = 6;

// Generics
function identity<T>(arg: T): T {
  return arg;
}

const num = identity<number>(42);
const str = identity("hello"); // Type inference works here

// Generic interface
interface Box<T> {
  value: T;
}

const numberBox: Box<number> = { value: 42 };
const stringBox: Box<string> = { value: "hello" };

// Type Guards
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function processValue(value: unknown): void {
  if (isString(value)) {
    // value is treated as string here
    console.log(value.toUpperCase());
  } else {
    console.log("Not a string:", value);
  }
}

// Export types and interfaces
export {
  User,
  ID,
  Status,
  Calculator,
  Box
};