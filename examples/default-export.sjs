/**
 * SuperJS Default Export Example
 * 
 * This file demonstrates how default exports work in SuperJS.
 */

// Default exported function
function greeting(name: string): string {
  return `Hello, ${name}! Welcome to SuperJS.`;
}

// Additional named exports
export const VERSION: string = '1.0.0';

export interface Config {
  debug: boolean;
  timeout: number;
  retries: number;
}

export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

export class Logger {
  private level: LogLevel;
  
  constructor(level: LogLevel = 'info') {
    this.level = level;
  }
  
  log(message: string, level: LogLevel = 'info'): void {
    if (this.shouldLog(level)) {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warning', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
}

export function formatMessage(message: string, prefix: string = ''): string {
  return prefix ? `${prefix}: ${message}` : message;
}

// You can only have one default export per file
export default greeting;

// Usage example:
// import greeting from './default-export.sjs';
// import { VERSION, Logger } from './default-export.sjs';