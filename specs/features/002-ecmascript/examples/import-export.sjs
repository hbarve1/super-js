// S4: import/export type checking

// Named exports
export const PI: number = 3.14159;
export function double(x: number): number { return x * 2; }
export class Counter {
  private count: number = 0;
  increment(): void { this.count++; }
  get value(): number { return this.count; }
}

// Default export
export default function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Type-only export (not emitted to JS)
export type { Counter as CounterType };

// Re-export from another module
// export { double as twice } from './math';

// Dynamic import — returns Promise<module>
async function loadModule(): Promise<void> {
  const mod = await import('./math');
  const result: number = mod.double(21);
  console.log(result); // 42
}

// Import namespace
// import * as Math from './math';
// const x: number = Math.PI;

// Side-effect import
// import './polyfills';
