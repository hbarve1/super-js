// SJS Example: Destructuring Type Annotations (ES2015+)
// Task 1.3 — specs/002-ecmascript-features/implementation-plan.md

// Object destructuring with type annotation
const config: { host: string; port: number; debug: boolean } = {
  host: "localhost",
  port: 8080,
  debug: true,
}
const { host, port, debug }: { host: string; port: number; debug: boolean } = config

// Array destructuring with tuple annotation
const point: [number, number] = [3.14, 2.72]
const [x, y]: [number, number] = point

// Nested object destructuring
const user = { name: "Alice", address: { city: "Berlin", zip: "10115" } }
const { name, address: { city } } = user

// Rest element in destructuring
const [first, second, ...rest] = [1, 2, 3, 4, 5]
const { a, b, ...others } = { a: 1, b: 2, c: 3, d: 4 }

// Default values in destructuring
const { width = 100, height = 200 } = { width: 800 }

// Function parameter destructuring
function render({ title, count }: { title: string; count: number }): string {
  return `${title} (${count})`
}
