/**
 * SuperJS Modules and Imports Examples
 * 
 * This file demonstrates modules, imports, and exports in SuperJS.
 */

// Import syntax examples
import { User, BankAccount } from './classes-interfaces.sjs';
import { identity, Container } from './generics.sjs';
import * as Types from './advanced-types.sjs';
import defaultGreeting from './default-export.sjs';

// Namespace imports
import * as Utils from './utility-module.sjs';

// Import with alias
import { Rectangle as Rect } from './classes-interfaces.sjs';

// Re-exporting
export { identity } from './generics.sjs';
export { type ID, type Person } from './advanced-types.sjs';

// Named exports
export const VERSION: string = '1.0.0';
export const API_URL: string = 'https://api.example.com';

// Export interface
export interface ApiClient {
  get<T>(url: string): Promise<T>;
  post<T, U>(url: string, data: T): Promise<U>;
  put<T, U>(url: string, data: T): Promise<U>;
  delete(url: string): Promise<void>;
}

// Export class
export class HttpClient implements ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }
  
  async get<T>(url: string): Promise<T> {
    const response = await fetch(this.baseUrl + url);
    return response.json();
  }
  
  async post<T, U>(url: string, data: T): Promise<U> {
    const response = await fetch(this.baseUrl + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
  
  async put<T, U>(url: string, data: T): Promise<U> {
    const response = await fetch(this.baseUrl + url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
  
  async delete(url: string): Promise<void> {
    await fetch(this.baseUrl + url, { method: 'DELETE' });
  }
}

// Export type
export type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

// Export enum
export enum HttpStatusCode {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  ServerError = 500
}

// Export function
export function createApiClient(baseUrl: string): ApiClient {
  return new HttpClient(baseUrl);
}

// Default export
export default HttpClient;

// Using the imports
function demoImports(): void {
  // Create a user from imported class
  const user = new User(1, "John Doe");
  console.log(user.toString());
  
  // Use imported generic function and class
  const stringValue = identity<string>("SuperJS");
  const container = new Container<number>(42);
  
  // Use type from wildcard import
  const point: Types.Point = { x: 10, y: 20 };
  
  // Use default import
  console.log(defaultGreeting("SuperJS"));
  
  // Use namespace import
  const formatted = Utils.formatDate(new Date());
  
  // Use aliased import
  const rect = new Rect(5, 10);
  console.log(`Rectangle area: ${rect.getArea()}`);
}

// Example usage of exports
const client = createApiClient('https://api.example.com');

async function fetchUsers() {
  try {
    const response: ApiResponse<User[]> = await client.get('/users');
    if (response.status === HttpStatusCode.OK) {
      return response.data;
    }
  } catch (error) {
    console.error('Error fetching users:', error);
  }
  return [];
}

// Module initialization code
console.log(`Module initialized - API Version: ${VERSION}`);