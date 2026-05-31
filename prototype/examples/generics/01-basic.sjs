// generics/01-basic.sjs — generic functions and type parameters
// A generic function works for any type T supplied by the caller.
// T? (nullable) is the safe return for "may not exist" without exceptions.

// --- Identity and pass-through ---

function identity<T>(x: T): T {
  return x
}

// --- Array generics returning T? (nullable) ---

function first<T>(arr: T[]): T? {
  return arr.length > 0 ? arr[0] : null
}

function last<T>(arr: T[]): T? {
  return arr.length > 0 ? arr[arr.length - 1] : null
}

function nth<T>(arr: T[], index: number): T? {
  return index >= 0 && index < arr.length ? arr[index] : null
}

// --- Pairing and zipping ---

function pair<A, B>(a: A, b: B): [A, B] {
  return [a, b]
}

function zip<A, B>(as: A[], bs: B[]): [A, B][] {
  const len = Math.min(as.length, bs.length)
  const result: [A, B][] = []
  for (let i = 0; i < len; i++) {
    result.push([as[i], bs[i]])
  }
  return result
}

function unzip<A, B>(pairs: [A, B][]): [A[], B[]] {
  const as: A[] = []
  const bs: B[] = []
  for (const p of pairs) {
    as.push(p[0])
    bs.push(p[1])
  }
  return [as, bs]
}

// --- Transformation helpers ---

function mapMaybe<T, U>(value: T?, f: (v: T) => U): U? {
  return value !== null ? f(value) : null
}

function getOrElse<T>(value: T?, fallback: T): T {
  return value !== null ? value : fallback
}

function repeat<T>(value: T, times: number): T[] {
  const result: T[] = []
  for (let i = 0; i < times; i++) {
    result.push(value)
  }
  return result
}

function flatten<T>(nested: T[][]): T[] {
  const result: T[] = []
  for (const arr of nested) {
    for (const item of arr) {
      result.push(item)
    }
  }
  return result
}

// --- Demos ---

console.log(identity(42))       // 42
console.log(identity("hello"))  // hello
console.log(identity(true))     // true

const nums = [10, 20, 30, 40]
console.log(first(nums))        // 10
console.log(last(nums))         // 40
console.log(nth(nums, 2))       // 30
console.log(nth(nums, 99))      // null

const empty: number[] = []
console.log(first(empty))       // null
console.log(last(empty))        // null

const p = pair("age", 25)
console.log(p)  // ["age", 25]

const names = ["alice", "bob", "carol"]
const scores = [95, 87, 92]
const zipped = zip(names, scores)
for (const [name, score] of zipped) {
  console.log(`${name}: ${score}`)
}
// alice: 95
// bob: 87
// carol: 92

const [ns, ss] = unzip(zipped)
console.log(ns)  // ["alice","bob","carol"]
console.log(ss)  // [95,87,92]

const maybeNum: number? = 7
console.log(mapMaybe(maybeNum, n => n * 10))  // 70

const nothing: number? = null
console.log(mapMaybe(nothing, n => n * 10))  // null

const notFound: string? = null
console.log(getOrElse(notFound, "default"))  // default
console.log(getOrElse("found", "default"))   // found

console.log(repeat(0, 5))        // [0,0,0,0,0]
console.log(repeat("x", 3))      // ["x","x","x"]

const nested = [[1, 2], [3, 4], [5]]
console.log(flatten(nested))  // [1,2,3,4,5]
