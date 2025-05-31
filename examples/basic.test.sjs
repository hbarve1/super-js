/**
 * Test file for basic.sjs
 * 
 * This file demonstrates the SuperJS testing framework with type annotations.
 */

import { test, describe, expect, beforeEach, mock } from 'superjs/test';
import { User, withLogging, double, loadUserData } from './basic.sjs';
import { formatDate } from './utils.sjs';

// Type for mock function
type MockFn<T extends any[] = any[], R = any> = (...args: T) => R;

// Mock the external fetch function
global.fetch = mock.fn() as MockFn;

describe('User class', () => {
  let user: User;
  
  beforeEach(() => {
    user = new User('John Doe', 'john@example.com');
  });
  
  test('constructor sets properties correctly', () => {
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john@example.com');
    expect(user.createdAt).toBeInstanceOf(Date);
  });
  
  test('getGreeting returns correct message', () => {
    expect(user.getGreeting()).toBe('Hello, John Doe!');
  });
  
  test('getFormattedCreationDate calls formatDate', () => {
    const mockFormatDate: MockFn<[Date], string> = mock.fn().mockReturnValue('2023-01-01');
    const originalFormatDate = formatDate;
    
    // Replace the real formatDate with our mock
    global.formatDate = mockFormatDate;
    
    const result: string = user.getFormattedCreationDate();
    
    expect(mockFormatDate).toHaveBeenCalledWith(user.createdAt);
    expect(result).toBe('2023-01-01');
    
    // Restore the original function
    global.formatDate = originalFormatDate;
  });
  
  test('fromJSON creates a user from JSON data', () => {
    const json: string = '{"name":"Alice","email":"alice@example.com"}';
    const user: User = User.fromJSON(json);
    
    expect(user).toBeInstanceOf(User);
    expect(user.name).toBe('Alice');
    expect(user.email).toBe('alice@example.com');
  });
  
  test('fromJSON also accepts object input', () => {
    const data: { name: string; email: string } = { name: 'Bob', email: 'bob@example.com' };
    const user: User = User.fromJSON(data);
    
    expect(user).toBeInstanceOf(User);
    expect(user.name).toBe('Bob');
    expect(user.email).toBe('bob@example.com');
  });
});

describe('utility functions', () => {
  test('double returns twice the input value', () => {
    expect(double(5)).toBe(10);
    expect(double(0)).toBe(0);
    expect(double(-3)).toBe(-6);
    
    // This would cause a type error at compile time
    // expect(double("not a number")).toBe(NaN);
  });
  
  test('withLogging wraps a function with logging', () => {
    // Mock console.log
    const originalLog: typeof console.log = console.log;
    console.log = mock.fn();
    
    const add = (a: number, b: number): number => a + b;
    const loggedAdd: typeof add = withLogging(add);
    const result: number = loggedAdd(2, 3);
    
    expect(result).toBe(5);
    expect(console.log).toHaveBeenCalledTimes(2);
    
    // Restore console.log
    console.log = originalLog;
  });
});

describe('loadUserData', () => {
  test('successfully loads and transforms user data', async () => {
    // Setup mock response
    const mockResponse = {
      ok: true,
      json: mock.fn().mockResolvedValue({
        name: 'Test User',
        email: 'test@example.com'
      })
    };
    
    global.fetch.mockResolvedValue(mockResponse);
    
    const user: User = await loadUserData(123);
    
    expect(fetch).toHaveBeenCalledWith('/api/users/123');
    expect(user).toBeInstanceOf(User);
    expect(user.name).toBe('Test User');
    expect(user.email).toBe('test@example.com');
  });
  
  test('throws error when fetch fails', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404
    });
    
    await expect(loadUserData(456)).rejects.toThrow('Failed to load user data: 404');
  });
  
  test('propagates fetch errors', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));
    
    await expect(loadUserData(789)).rejects.toThrow('Network error');
  });
});