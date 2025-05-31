/**
 * SuperJS Example File
 *
 * This file demonstrates basic SuperJS syntax and features.
 * Note that SuperJS extends JavaScript with type annotations
 * while maintaining ECMA-compliant runtime behavior.
 */

// Import functionality from another module
import { formatDate } from './utils.sjs';

// Type definition using interface
interface UserData {
  name: string;
  email: string;
  createdAt?: Date;
}

/**
 * A simple User class
 */
class User {
  // Property type declarations
  name: string;
  email: string;
  createdAt: Date;

  constructor(name: string, email: string) {
    this.name = name;
    this.email = email;
    this.createdAt = new Date();
  }

  getGreeting(): string {
    return `Hello, ${this.name}!`;
  }

  getFormattedCreationDate(): string {
    return formatDate(this.createdAt);
  }

  static fromJSON(json: string | object): User {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    return new User(data.name, data.email);
  }
}

/**
 * Higher-order function example with generics
 */
function withLogging<T, R>(fn: (...args: T[]) => R): (...args: T[]) => R {
  return function(...args: T[]): R {
    console.log(`Calling function with args: ${JSON.stringify(args)}`);
    const result = fn(...args);
    console.log(`Function returned: ${JSON.stringify(result)}`);
    return result;
  };
}

// Arrow function with implicit return and type annotation
const double = (x: number): number => x * 2;

// Array methods and destructuring with type annotations
const numbers: number[] = [1, 2, 3, 4, 5];
const [first, second, ...rest]: [number, number, ...number[]] = numbers;
const doubled: number[] = numbers.map(double);
const sum: number = numbers.reduce((total: number, n: number): number => total + n, 0);

// Object spread and shorthand with interfaces
interface FetchOptions {
  timeout?: number;
  retries?: number;
  url?: string;
  [key: string]: any;
}

const defaultOptions: FetchOptions = { timeout: 1000, retries: 3 };
function fetchData(url: string, options: FetchOptions = {}): Promise<Response> {
  const config: FetchOptions = { ...defaultOptions, ...options, url };
  return fetch(config.url!, config);
}

// Async/await with type annotations
async function loadUserData(userId: string | number): Promise<User> {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error(`Failed to load user data: ${response.status}`);
    }
    const data: UserData = await response.json();
    return User.fromJSON(data);
  } catch (error: unknown) {
    console.error('Error loading user:', error);
    throw error;
  }
}

// Module exports
export { User, withLogging, double, loadUserData };
