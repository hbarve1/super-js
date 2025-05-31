/**
 * SuperJS Type System Examples
 * 
 * This file demonstrates the full range of SuperJS type system features.
 * All type annotations are erased at compile time and produce standard JavaScript.
 */

// Basic Type Annotations
// ---------------------

// Primitive types
let name: string = "SuperJS";
let age: number = 1;
let isActive: boolean = true;
let nothing: null = null;
let notDefined: undefined = undefined;
let uniqueId: symbol = Symbol("id");
let bigNumber: bigint = 9007199254740991n;

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
let namedTuple: [name: string, age: number] = ["David", 30];

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
let something: unknown = fetchDataFromServer();
// Need type checking before using unknown values
if (typeof something === "string") {
  console.log(something.toUpperCase());
}

// never - for functions that never return normally
function throwError(message: string): never {
  throw new Error(message);
}

// void - for functions with no return value
function logMessage(message: string): void {
  console.log(message);
}

// Type Assertions
// --------------
let someValue: unknown = "SuperJS is awesome";
let strLength: number = (someValue as string).length;
let alternativeSyntax: number = (<string>someValue).length; // Alternative syntax

// Interfaces
interface User {
  id: number;
  name: string;
  email: string;
  age?: number; // Optional property
  readonly createdAt: Date; // Can't be modified after creation
}

// Interface implementation
const alice: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  createdAt: new Date()
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

// Interface extension
interface Employee extends User {
  department: string;
  salary: number;
}

// Classes with interfaces
class Manager implements Employee {
  id: number;
  name: string;
  email: string;
  readonly createdAt: Date;
  department: string;
  salary: number;
  private reports: Employee[] = [];

  constructor(id: number, name: string, email: string, department: string, salary: number) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.createdAt = new Date();
    this.department = department;
    this.salary = salary;
  }

  addReport(employee: Employee): void {
    this.reports.push(employee);
  }

  getReports(): Employee[] {
    return [...this.reports];
  }
}

// Type Aliases
// -----------
type ID = string | number;
type Point = { x: number; y: number };
type Callback = (data: any) => void;

// Union and Intersection Types
// --------------------------
type Status = "pending" | "approved" | "rejected";
let currentStatus: Status = "pending";

// String literal types
type Direction = "north" | "south" | "east" | "west";
let heading: Direction = "north";

// Numeric literal types
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;
let roll: DiceRoll = 6;

// Intersection types
type AdminUser = User & { permissions: string[] };
const admin: AdminUser = {
  id: 999,
  name: "Admin",
  email: "admin@example.com",
  createdAt: new Date(),
  permissions: ["create", "read", "update", "delete"]
};

// Generics
// -------
// Generic function
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

// Generic class
class Container<T> {
  private item: T;

  constructor(item: T) {
    this.item = item;
  }

  getItem(): T {
    return this.item;
  }
}

const numberContainer = new Container<number>(123);
const stringContainer = new Container("SuperJS");

// Generic constraints
interface Lengthwise {
  length: number;
}

function getLength<T extends Lengthwise>(arg: T): number {
  return arg.length;
}

getLength("SuperJS");
getLength([1, 2, 3]);
// getLength(123); // Error: number doesn't have length property

// Type Guards
// ----------
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isUser(value: unknown): value is User {
  return (
    value !== null &&
    typeof value === "object" &&
    "id" in value &&
    "name" in value &&
    "email" in value
  );
}

function processValue(value: unknown) {
  if (isString(value)) {
    // value is treated as string here
    console.log(value.toUpperCase());
  } else if (isUser(value)) {
    // value is treated as User here
    console.log(`User: ${value.name} (${value.email})`);
  } else {
    console.log("Unknown value type");
  }
}

// Utility Types
// -----------
// Partial - makes all properties optional
type PartialUser = Partial<User>;
const partialUser: PartialUser = { name: "Partial" }; // No error even though missing required fields

// Required - makes all properties required
type RequiredPoint = Required<{ x?: number; y?: number }>;
const requiredPoint: RequiredPoint = { x: 10, y: 20 }; // Must have both x and y

// Pick - select specific properties
type UserCredentials = Pick<User, "id" | "email">;
const credentials: UserCredentials = { id: 1, email: "user@example.com" };

// Omit - remove specific properties
type UserWithoutId = Omit<User, "id" | "createdAt">;
const userWithoutId: UserWithoutId = { name: "No ID", email: "noid@example.com" };

// Record - create a type with specified properties
type UserRoles = Record<string, string[]>;
const roles: UserRoles = {
  admin: ["all"],
  editor: ["create", "update"],
  viewer: ["read"]
};

// Decorators (Experimental)
function logged(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function(...args: any[]) {
    console.log(`Calling ${propertyKey} with args: ${JSON.stringify(args)}`);
    const result = original.apply(this, args);
    console.log(`Result: ${JSON.stringify(result)}`);
    return result;
  };
  return descriptor;
}

class Calculator {
  @logged
  add(a: number, b: number): number {
    return a + b;
  }
}

// Async Types
// ----------
async function fetchData(): Promise<User[]> {
  const response = await fetch("https://api.example.com/users");
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  return response.json() as Promise<User[]>;
}

// Advanced Type Inference
// ---------------------
// Return type inference
function createUser(name: string, email: string) {
  return { id: Date.now(), name, email, createdAt: new Date() };
}
type CreatedUser = ReturnType<typeof createUser>;

// Parameter type inference
function handleEvent(callback: (event: { type: string; data?: any }) => void) {
  callback({ type: "click" });
}

// Module usage
function fetchDataFromServer(): unknown {
  // Implementation
  return { data: "example" };
}

// Export types and interfaces
export {
  User,
  ID,
  Status,
  Calculator,
  Box,
  Container
};