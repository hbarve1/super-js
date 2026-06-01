// ── Module Exports ─────────────────────────────────────────────────────────
// This file is imported by modules/main.sjs

// Named exports
export const PI: number = 3.14159265358979

export type Vector2D = { x: number; y: number }
export type Vector3D = { x: number; y: number; z: number }

export function add(a: number, b: number): number { return a + b }
export function subtract(a: number, b: number): number { return a - b }
export function multiply(a: number, b: number): number { return a * b }
export function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero")
  return a / b
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Export class
export class Vec2 {
  constructor(public x: number, public y: number) {}

  add(other: Vec2): Vec2 { return new Vec2(this.x + other.x, this.y + other.y) }
  scale(s: number): Vec2 { return new Vec2(this.x * s, this.y * s) }
  length(): number { return Math.sqrt(this.x ** 2 + this.y ** 2) }
  normalize(): Vec2 {
    const len = this.length()
    return len === 0 ? new Vec2(0, 0) : this.scale(1 / len)
  }
  dot(other: Vec2): number { return this.x * other.x + this.y * other.y }
  toString(): string { return `Vec2(${this.x}, ${this.y})` }
}

// Default export
export default class MathUtils {
  static factorial(n: number): number {
    if (n <= 1) return 1
    return n * MathUtils.factorial(n - 1)
  }

  static fibonacci(n: number): number {
    if (n <= 1) return n
    let a = 0, b = 1
    for (let i = 2; i <= n; i++) { [a, b] = [b, a + b] }
    return b
  }

  static isPrime(n: number): boolean {
    if (n < 2) return false
    for (let i = 2; i * i <= n; i++) if (n % i === 0) return false
    return true
  }

  static range(start: number, end: number, step: number = 1): number[] {
    const result: number[] = []
    for (let i = start; i < end; i += step) result.push(i)
    return result
  }
}
