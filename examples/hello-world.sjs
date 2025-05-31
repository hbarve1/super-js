/**
 * Hello SuperJS
 * 
 * This is a simple SuperJS test file demonstrating basic features.
 */

// Basic type annotations
const message: string = 'Hello, SuperJS!';
const version: number = 0.1;
const isEnabled: boolean = true;

// Interface declaration
interface Person {
  name: string;
  age: number;
  email?: string;
}

// Function with type annotations
function greet(person: Person): string {
  return `Hello, ${person.name}! You are ${person.age} years old.`;
}

// Class with type annotations
class Greeter {
  private greeting: string;
  
  constructor(greeting: string) {
    this.greeting = greeting;
  }
  
  greet(name: string): string {
    return `${this.greeting}, ${name}!`;
  }
  
  static createDefault(): Greeter {
    return new Greeter('Welcome');
  }
}

// Array with type annotations
const numbers: number[] = [1, 2, 3, 4, 5];
const doubled: number[] = numbers.map((n: number): number => n * 2);

// Define age variable explicitly
const userAge: number = 30;

// Object with interface type
const user: Person = {
  name: 'John Doe',
  age: userAge,
  email: 'john@example.com'
};

// Using generics
function identity<T>(value: T): T {
  return value;
}

const stringValue: string = identity<string>('SuperJS');
const numberValue: number = identity(42); // Type inference

// Union types
type ID = string | number;
const userId: ID = 'user-123';
const postId: ID = 456;

// Print some results
console.log(message);
console.log(greet(user));
console.log(new Greeter('Hello').greet('SuperJS'));
console.log(doubled);

// Export for external use
export { greet, Greeter, Person };