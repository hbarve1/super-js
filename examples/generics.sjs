/**
 * SuperJS Generics Examples
 * 
 * This file demonstrates generics in SuperJS.
 */

// Basic Generic Function
function identity<T>(arg: T): T {
  return arg;
}

const stringValue: string = identity<string>("hello");
const numberValue: number = identity(42); // Type inference works

// Generic Interface
interface Box<T> {
  value: T;
  getValue(): T;
  setValue(value: T): void;
}

// Implementation of Generic Interface
class Container<T> implements Box<T> {
  value: T;
  
  constructor(initialValue: T) {
    this.value = initialValue;
  }
  
  getValue(): T {
    return this.value;
  }
  
  setValue(newValue: T): void {
    this.value = newValue;
  }
}

const numberBox = new Container<number>(123);
const stringBox = new Container<string>("SuperJS");

console.log(numberBox.getValue()); // 123
console.log(stringBox.getValue()); // "SuperJS"

// Generic Constraints
interface Lengthwise {
  length: number;
}

function getLength<T extends Lengthwise>(arg: T): number {
  return arg.length;
}

console.log(getLength("SuperJS")); // 8
console.log(getLength([1, 2, 3])); // 3
console.log(getLength({ length: 10 })); // 10

// Generic Classes
class Queue<T> {
  private items: T[] = [];
  
  enqueue(item: T): void {
    this.items.push(item);
  }
  
  dequeue(): T | undefined {
    return this.items.shift();
  }
  
  peek(): T | undefined {
    return this.items[0];
  }
  
  size(): number {
    return this.items.length;
  }
  
  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

const numberQueue = new Queue<number>();
numberQueue.enqueue(1);
numberQueue.enqueue(2);
numberQueue.enqueue(3);

console.log(numberQueue.dequeue()); // 1
console.log(numberQueue.peek());    // 2
console.log(numberQueue.size());    // 2

// Multiple Type Parameters
function pair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
}

const pairResult = pair<string, number>("SuperJS", 1);
console.log(pairResult); // ["SuperJS", 1]

// Generic with Default Type Parameter
interface ApiResponse<T = any> {
  data: T;
  status: number;
  message: string;
}

function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  return fetch(url)
    .then(response => response.json())
    .then(data => ({
      data,
      status: 200,
      message: "Success"
    }));
}

// Using generics with interfaces
interface KeyValuePair<K, V> {
  key: K;
  value: V;
}

const stringToNumber: KeyValuePair<string, number> = {
  key: "age",
  value: 30
};

// Generic Type Aliases
type Nullable<T> = T | null | undefined;
type Callback<T, R> = (data: T) => R;

let nullableString: Nullable<string> = "hello";
nullableString = null; // valid
nullableString = undefined; // valid

// Function using the callback type
function processData<T, R>(data: T, callback: Callback<T, R>): R {
  return callback(data);
}

const doubledNumber = processData(10, (num) => num * 2);
console.log(doubledNumber); // 20

// Generic Utility Types
type Partial<T> = {
  [P in keyof T]?: T[P];
};

type ReadOnly<T> = {
  readonly [P in keyof T]: T[P];
};

interface User {
  id: number;
  name: string;
  email: string;
}

const partialUser: Partial<User> = {
  name: "John" // id and email can be omitted
};

const readOnlyUser: ReadOnly<User> = {
  id: 1,
  name: "John",
  email: "john@example.com"
};

// readOnlyUser.name = "Jane"; // Error: Cannot assign to 'name' because it is a read-only property

// Conditional Types with Generics
type NonNullable<T> = T extends null | undefined ? never : T;
type ExtractReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type StringOrNull = string | null;
type JustString = NonNullable<StringOrNull>; // string

function greeting(name: string): string {
  return `Hello, ${name}!`;
}

type GreetingReturnType = ExtractReturnType<typeof greeting>; // string

// Generic Record Type
type Record<K extends keyof any, T> = {
  [P in K]: T;
};

type UserRoles = Record<string, string[]>;

const roles: UserRoles = {
  admin: ["manage", "create", "delete"],
  editor: ["create", "update"],
  viewer: ["read"]
};

// Export for reuse
export {
  identity,
  Box,
  Container,
  Queue,
  KeyValuePair,
  Nullable,
  Callback,
  Partial,
  ReadOnly,
  Record
};