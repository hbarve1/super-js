// structural-interfaces/02-generic-interfaces.sjs — <T: Constraint> generic syntax
//
// SJS uses `<T: Interface>` for type parameter constraints, not `T extends Interface`.
// Multiple constraints are written as `<T: A & B>` in the type parameter list only.
// The `&` in a constraint position is distinct from intersection types in value positions.
//
// Three constraint patterns shown here:
//   1. Single constraint:   <T: Comparable<T>>
//   2. Self-referential:    <T: Comparable<T>>  (T appears in its own constraint)
//   3. Multiple:            <T: Comparable<T> & Printable>

// ─── Interfaces ────────────────────────────────────────────────────────────

// Self-referential: T must be comparable to itself.
interface Comparable<T> {
  compareTo(other: T): number  // negative = less, 0 = equal, positive = greater
}

interface Printable {
  print(): void
}

interface HasLength {
  length: number
}

// ─── Single constraint: <T: Comparable<T>> ─────────────────────────────────

function min<T: Comparable<T>>(a: T, b: T): T {
  return a.compareTo(b) <= 0 ? a : b
}

function max<T: Comparable<T>>(a: T, b: T): T {
  return a.compareTo(b) >= 0 ? a : b
}

// Returns the minimum element from a non-empty array.
function minOf<T: Comparable<T>>(items: T[]): T? {
  if (items.length === 0) return null
  let result = items[0]
  for (const item of items) {
    if (item.compareTo(result) < 0) result = item
  }
  return result
}

// ─── Multiple constraints: <T: Comparable<T> & Printable> ─────────────────

// Sort in place and print each element.
function sortAndPrint<T: Comparable<T> & Printable>(items: T[]): void {
  items.sort((a, b) => a.compareTo(b))
  items.forEach(item => item.print())
}

// Sort and return a new sorted array without mutating the input.
function sorted<T: Comparable<T>>(items: T[]): T[] {
  return [...items].sort((a, b) => a.compareTo(b))
}

// ─── Concrete class: Temperature ──────────────────────────────────────────

class Temperature {
  value: number

  constructor(v: number) {
    this.value = v
  }

  // Satisfies Comparable<Temperature> by shape — no `implements` needed
  compareTo(other: Temperature): number {
    return this.value - other.value
  }

  // Satisfies Printable by shape
  print(): void {
    console.log(this.value + "°")
  }
}

// ─── Concrete class: Score ─────────────────────────────────────────────────

class Score {
  label: string
  points: number

  constructor(label: string, points: number) {
    this.label = label
    this.points = points
  }

  compareTo(other: Score): number {
    return this.points - other.points
  }

  print(): void {
    console.log(this.label + ": " + this.points)
  }
}

// ─── Demo ──────────────────────────────────────────────────────────────────

const t1 = new Temperature(30)
const t2 = new Temperature(20)
const t3 = new Temperature(25)

// min / max with a single constraint
console.log(min(t1, t2).value)   // 20
console.log(max(t1, t2).value)   // 30

// minOf a collection
const coldest = minOf([t1, t2, t3])
if (coldest !== null) console.log(coldest.value)  // 20

// sortAndPrint requires Comparable<T> & Printable
const temps = [new Temperature(30), new Temperature(10), new Temperature(20)]
sortAndPrint(temps)
// 10°
// 20°
// 30°

// sorted (non-mutating) returns a new array
const scores = [
  new Score("Alice", 87),
  new Score("Bob", 95),
  new Score("Carol", 76)
]
const ranked = sorted(scores)
ranked.forEach(s => s.print())
// Carol: 76
// Alice: 87
// Bob: 95
