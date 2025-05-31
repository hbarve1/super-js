/**
 * Declaration file for an external JavaScript library
 * 
 * This file provides type definitions for the 'external-lib' JavaScript library,
 * allowing SuperJS to understand and validate usage of the library.
 */

declare module 'external-lib' {
  /**
   * Configuration options for the library
   */
  export interface LibraryOptions {
    /** Enable debug mode */
    debug?: boolean;
    /** Timeout in milliseconds */
    timeout?: number;
    /** API key for authentication */
    apiKey?: string;
    /** Base URL for API requests */
    baseUrl?: string;
    /** Custom headers to include with requests */
    headers?: Record<string, string>;
  }

  /**
   * Response structure for API calls
   */
  export interface ApiResponse<T = any> {
    /** Status code of the response */
    status: number;
    /** Whether the request was successful */
    success: boolean;
    /** Response data */
    data?: T;
    /** Error message if unsuccessful */
    error?: string;
    /** Response metadata */
    meta?: {
      /** Pagination information */
      pagination?: {
        /** Current page number */
        page: number;
        /** Total number of pages */
        totalPages: number;
        /** Total number of items */
        totalItems: number;
      };
      /** Request timestamp */
      timestamp: number;
    };
  }

  /**
   * User data structure
   */
  export interface User {
    /** Unique identifier */
    id: string | number;
    /** User's name */
    name: string;
    /** User's email address */
    email: string;
    /** User's role */
    role: 'admin' | 'user' | 'guest';
    /** Account creation date */
    createdAt: string;
    /** Last login timestamp */
    lastLogin?: string;
  }

  /**
   * Initialize the library
   * @param options Configuration options
   * @returns Client instance
   */
  export function initialize(options: LibraryOptions): Client;

  /**
   * Main client class for interacting with the API
   */
  export class Client {
    /**
     * Create a new client instance
     * @param options Configuration options
     */
    constructor(options: LibraryOptions);

    /**
     * Get the current configuration
     * @returns Current configuration options
     */
    getConfig(): LibraryOptions;

    /**
     * Update the client configuration
     * @param options New configuration options
     */
    updateConfig(options: Partial<LibraryOptions>): void;

    /**
     * Fetch a user by ID
     * @param id User ID
     * @returns Promise resolving to API response containing user data
     */
    getUser(id: string | number): Promise<ApiResponse<User>>;

    /**
     * Fetch all users
     * @param page Page number for pagination
     * @param limit Number of items per page
     * @returns Promise resolving to API response containing array of users
     */
    getUsers(page?: number, limit?: number): Promise<ApiResponse<User[]>>;

    /**
     * Create a new user
     * @param userData User data
     * @returns Promise resolving to API response containing created user
     */
    createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<ApiResponse<User>>;

    /**
     * Update an existing user
     * @param id User ID
     * @param userData User data to update
     * @returns Promise resolving to API response containing updated user
     */
    updateUser(id: string | number, userData: Partial<User>): Promise<ApiResponse<User>>;

    /**
     * Delete a user
     * @param id User ID
     * @returns Promise resolving to API response
     */
    deleteUser(id: string | number): Promise<ApiResponse<void>>;

    /**
     * Event handler for API events
     * @param event Event name
     * @param callback Function to call when event occurs
     */
    on(event: 'error' | 'request' | 'response', callback: (data: any) => void): void;
  }

  /**
   * Utility functions
   */
  export namespace utils {
    /**
     * Format a date string
     * @param date Date to format
     * @param format Format string
     * @returns Formatted date string
     */
    function formatDate(date: Date | string, format?: string): string;

    /**
     * Generate a unique ID
     * @param length ID length
     * @param options Generation options
     * @returns Unique ID string
     */
    function generateId(length?: number, options?: { 
      includeNumbers?: boolean;
      includeSymbols?: boolean;
    }): string;

    /**
     * Validate an email address
     * @param email Email to validate
     * @returns Whether the email is valid
     */
    function validateEmail(email: string): boolean;
  }

  /**
   * Error classes
   */
  export class ApiError extends Error {
    /** HTTP status code */
    status: number;
    /** Error code */
    code: string;

    /**
     * Create a new API error
     * @param message Error message
     * @param status HTTP status code
     * @param code Error code
     */
    constructor(message: string, status: number, code: string);
  }
}