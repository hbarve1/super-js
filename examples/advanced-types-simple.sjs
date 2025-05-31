/**
 * SuperJS Advanced Type Examples (Simplified)
 * 
 * This file demonstrates advanced type features in SuperJS.
 */

// Union Types
// Allow a value to be one of several types
type ID = string | number;
let userId: ID = 123;
userId = "user-abc-123"; // Also valid

// Intersection Types
// Combine multiple types into one
type Name = { firstName: string; lastName: string };
type Age = { age: number };
type Person = Name & Age;

const person: Person = {
  firstName: "John",
  lastName: "Doe",
  age: 30
};

// Literal Types
// Specific string/number values as types
type Direction = "north" | "south" | "east" | "west";
let heading: Direction = "north";

type Dice = 1 | 2 | 3 | 4 | 5 | 6;
let roll: Dice = 6;

// Type Aliases
// Create a new name for a type
type Point = { x: number; y: number };
let center: Point = { x: 0, y: 0 };

// Nullable Types
// Handle null and undefined
type MaybeString = string | null | undefined;
let lastName: MaybeString = "Smith";
lastName = null; // Valid
lastName = undefined; // Valid

// Type Assertions
// Tell the compiler you know the type better than it does
let someValue: any = "SuperJS";
let strLength: number = (someValue as string).length;

// Simple interface
interface Dictionary {
  name: string;
  age: number;
  location: string;
}

const dict: Dictionary = {
  name: "John",
  age: 30,
  location: "New York"
};

// Simple User interface
interface User {
  name: string;
  email: string;
  active: boolean;
}

// Type Guards
// Runtime checks that guarantee types in their scope
function isString(value: any): value is string {
  return typeof value === "string";
}

function processValue(value: string | number): string {
  if (isString(value)) {
    // value is typed as string in this block
    return value.toUpperCase();
  } else {
    // value is typed as number in this block
    return value.toFixed(2);
  }
}

// Discriminated Unions
// Special kind of union where the type can be determined at runtime
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
  if (shape.kind === "circle") {
    return Math.PI * shape.radius * shape.radius;
  } else {
    return shape.sideLength * shape.sideLength;
  }
}

const circle: Circle = { kind: "circle", radius: 5 };
console.log(`Circle area: ${getArea(circle)}`);

// Export types for reuse
export {
  ID,
  Person,
  Direction,
  Point,
  Dictionary,
  Shape
};