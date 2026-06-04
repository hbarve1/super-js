// Destructuring Type Annotations — ECMA-262 §14.3.3
// SJS extracts per-binding types from the declared pattern annotation.

// ── Object destructuring with type annotation ─────────────────────────────────

const { x, y }: { x: number; y: string } = { x: 1, y: "hello" }
const doubled: number = x  // x: number — OK
const greeting: string = y  // y: string — OK

// Renamed binding
const { x: width, y: height }: { x: number; y: number } = { x: 100, y: 200 }
const area: number = width * height  // width: number, height: number — OK

// ── Array destructuring with tuple annotation ─────────────────────────────────

const [first, second]: [number, string] = [42, "world"]
const n: number = first   // first: number — OK
const s: string = second  // second: string — OK

// ── Array destructuring with array annotation ─────────────────────────────────

const [a, b, c]: number[] = [1, 2, 3]
const sum: number = a + b + c  // all: number — OK

// ── Rest patterns ─────────────────────────────────────────────────────────────

// Object rest — remainder after destructured keys
const { name, ...attrs }: { name: string; age: number; active: boolean } = {
  name: "Alice",
  age: 30,
  active: true,
}
// attrs: { age: number; active: boolean }

// Array rest — remaining elements as array
const [head, ...tail]: [string, number, boolean] = ["hello", 42, true]
// head: string, tail: Array<number | boolean>

// ── Nested destructuring ──────────────────────────────────────────────────────

const { address: { city, zip } }: { address: { city: string; zip: number } } = {
  address: { city: "New York", zip: 10001 },
}
const cityName: string = city  // city: string — OK
const zipCode: number = zip    // zip: number — OK

// Nested array inside object
const { coords: [lat, lng] }: { coords: [number, number] } = {
  coords: [40.7128, -74.006],
}
const latitude: number = lat   // lat: number — OK
const longitude: number = lng  // lng: number — OK
