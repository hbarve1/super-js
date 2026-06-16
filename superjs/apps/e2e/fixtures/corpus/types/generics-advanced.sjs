// types/generics-advanced.sjs — constrained generics, generic classes, Option<T>
// Uses <T: Interface> constraint syntax (NOT T extends).
// No conditional types, mapped types, infer, keyof, or any.

// --- Constraint interfaces ---

type HasLength {
  length: number
}

type Comparable<T> {
  compareTo(other: T): number
}

type Printable {
  toString(): string
}

// --- Constrained generic functions ---

// T must have a .length property
function getLength<T: HasLength>(x: T): number {
  return x.length
}

function getLonger<T: HasLength>(a: T, b: T): T {
  return a.length >= b.length ? a : b
}

// T must support compareTo
function min<T: Comparable<T>>(a: T, b: T): T {
  return a.compareTo(b) <= 0 ? a : b
}

function max<T: Comparable<T>>(a: T, b: T): T {
  return a.compareTo(b) >= 0 ? a : b
}

function clamp<T: Comparable<T>>(value: T, lo: T, hi: T): T {
  return min(max(value, lo), hi)
}

// Multiple constraints via &
function printLonger<T: HasLength & Printable>(a: T, b: T): void {
  const winner = a.length >= b.length ? a : b
  console.log("longer:", winner.toString())
}

// --- Generic class ---

class Stack<T> {
  private items: T[] = []

  push(item: T): void {
    this.items.push(item)
  }

  pop(): T? {
    return this.items.length > 0 ? this.items.pop() : null
  }

  peek(): T? {
    return this.items.length > 0 ? this.items[this.items.length - 1] : null
  }

  get size(): number {
    return this.items.length
  }

  isEmpty(): boolean {
    return this.items.length === 0
  }
}

// --- Option<T> sum type ---

type Option<T> = | Some(T) | None

function mapOption<T, U>(o: Option<T>, f: (v: T) => U): Option<U> {
  return match o {
    Some(v) => Some(f(v))
    None    => None
  }
}

function getOrElse<T>(o: Option<T>, fallback: T): T {
  return match o {
    Some(v) => v
    None    => fallback
  }
}

function flatMapOption<T, U>(o: Option<T>, f: (v: T) => Option<U>): Option<U> {
  return match o {
    Some(v) => f(v)
    None    => None
  }
}

function optionFromNullable<T>(value: T?): Option<T> {
  return value !== null ? Some(value) : None
}

// --- Concrete Comparable example ---

class Temperature implements Comparable<Temperature>, Printable {
  celsius: number

  constructor(c: number) {
    this.celsius = c
  }

  compareTo(other: Temperature): number {
    return this.celsius - other.celsius
  }

  toString(): string {
    return this.celsius + "°C"
  }
}

// --- Demos ---

console.log(getLength("hello"))    // 5
console.log(getLength([1, 2, 3]))  // 3

const t1 = new Temperature(20)
const t2 = new Temperature(35)
const t3 = new Temperature(10)

console.log(min(t1, t2).toString())  // 20°C
console.log(max(t1, t2).toString())  // 35°C
console.log(clamp(t2, t3, t1).toString())  // 20°C

const numStack = new Stack<number>()
numStack.push(1)
numStack.push(2)
numStack.push(3)
console.log(numStack.peek())   // 3
console.log(numStack.pop())    // 3
console.log(numStack.size)     // 2

const strStack = new Stack<string>()
strStack.push("a")
strStack.push("b")
console.log(strStack.pop())    // b
console.log(strStack.isEmpty()) // false

const present: Option<number> = Some(42)
const absent: Option<number> = None

console.log(getOrElse(present, 0))          // 42
console.log(getOrElse(absent, 0))           // 0
console.log(getOrElse(mapOption(present, n => n * 2), 0))  // 84

const chained = flatMapOption(present, n => n > 10 ? Some(n - 10) : None)
console.log(getOrElse(chained, -1))  // 32
