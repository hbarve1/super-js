/**
 * SuperJS Utilities
 * 
 * Common utility functions for SuperJS applications.
 * Demonstrates type annotations in utility functions.
 */

/**
 * Formats a date according to the specified format string.
 * Uses a simple token-based system similar to strftime.
 * 
 * @param {Date} date - The date to format
 * @param {string} [format='YYYY-MM-DD'] - Format string
 * @returns {string} Formatted date string
 */
export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  if (!(date instanceof Date)) {
    throw new TypeError('First argument must be a Date object');
  }
  
  const tokens: Record<string, string | number> = {
    YYYY: date.getFullYear(),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    DD: String(date.getDate()).padStart(2, '0'),
    HH: String(date.getHours()).padStart(2, '0'),
    mm: String(date.getMinutes()).padStart(2, '0'),
    ss: String(date.getSeconds()).padStart(2, '0'),
  };
  
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => tokens[match]);
}

/**
 * Debounces a function call.
 * 
 * @param {Function} fn - The function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return function(this: any, ...args: Parameters<T>): void {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Creates a deep clone of an object or array
 * 
 * @param {*} value - Value to clone
 * @returns {*} Cloned value
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item)) as unknown as T;
  }
  
  if (value instanceof Date) {
    return new Date(value) as unknown as T;
  }
  
  const result: Record<string, any> = {};
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      result[key] = deepClone(value[key]);
    }
  }
  return result;
}

/**
 * Checks if a value is empty (null, undefined, empty string, empty array, empty object)
 * 
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value: unknown): boolean {
  if (value == null) {
    return true;
  }
  
  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
}

/**
 * Generates a random string with specified length
 * 
 * @param {number} [length=8] - Length of the random string
 * @returns {string} Random string
 */
export function randomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars.charAt(randomIndex);
  }
  
  return result;
}

/**
 * Memoizes a function to cache results
 * 
 * @param {Function} fn - Function to memoize
 * @returns {Function} Memoized function
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();
  
  return function(this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}