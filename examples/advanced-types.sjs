/**
 * SuperJS Advanced Type Examples
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
// heading = "upward"; // Error: Type '"upward"' is not assignable to type 'Direction'

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
let otherLength: number = (<string>someValue).length; // Alternative syntax

// Index Signatures
// Define types for dynamic properties
interface Dictionary {
  [key: string]: string | number;
}

const dict: Dictionary = {
  name: "John",
  age: 30,
  location: "New York"
};

// Mapped Types
// Transform existing types into new ones
interface User {
  name: string;
  email: string;
  active: boolean;
}

type ReadOnly<T> = {
  readonly [K in keyof T]: T[K];
};

const readOnlyUser: ReadOnly<User> = {
  name: "Jane",
  email: "jane@example.com",
  active: true
};

// readOnlyUser.name = "John"; // Error: Cannot assign to 'name' because it is a read-only property

// Conditional Types
// Types that act like if statements
type NonNullable<T> = T extends null | undefined ? never : T;
type StringOrNumber = string | number | null;
type ValidValue = NonNullable<StringOrNumber>; // string | number

// Type Guards
// Runtime checks that guarantee types in their scope
function isString(value: any): value is string {
  return typeof value === "string";
}

function processValue(value: string | number) {
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
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.sideLength ** 2;
  }
}

const circle: Circle = { kind: "circle", radius: 5 };
console.log(`Circle area: ${getArea(circle)}`);

// Recursive Types
// Types that reference themselves
type TreeNode<T> = {
  value: T;
  left?: TreeNode<T>;
  right?: TreeNode<T>;
};

const tree: TreeNode<number> = {
  value: 1,
  left: {
    value: 2,
    left: { value: 3 }
  },
  right: {
    value: 4,
    right: { value: 5 }
  }
};

// Export types for reuse
export {
  ID,
  Person,
  Direction,
  Point,
  Dictionary,
  Shape,
  TreeNode
};