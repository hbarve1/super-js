// ── Module Imports ─────────────────────────────────────────────────────────

// Named imports
import { PI, add, multiply, clamp, lerp, Vec2 } from "./math.sjs"

// Default import
import MathUtils from "./math.sjs"

// Rename on import
import { subtract as sub, divide as div } from "./math.sjs"

// Import type only
import type { Vector2D } from "./math.sjs"

// Namespace import
import * as Math_ from "./math.sjs"

// Side-effect import (runs module, imports nothing)
// import "./setup.sjs"

// Dynamic import
async function loadModule() {
  const module = await import("./math.sjs")
  return module.add(5, 3)
}

// Usage
console.log(`PI = ${PI}`)
console.log(add(2, 3), multiply(4, 5))
console.log(sub(10, 3), div(15, 3))
console.log(clamp(15, 0, 10), lerp(0, 100, 0.3))

const v1 = new Vec2(3, 4)
const v2 = new Vec2(1, 2)
console.log(v1.add(v2).toString())
console.log(v1.length())
console.log(v1.normalize().toString())

console.log(MathUtils.factorial(6))
console.log(MathUtils.fibonacci(10))
console.log(MathUtils.isPrime(17))
console.log(MathUtils.range(0, 10, 2))

// Namespace usage
console.log(Math_.PI)
console.log(Math_.add(1, 2))

// Type-only (erased at compile time)
const point: Vector2D = { x: 5, y: 10 }
console.log(point)

loadModule().then(result => console.log("Dynamic:", result))
