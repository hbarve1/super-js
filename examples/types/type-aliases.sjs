// types/type-aliases.sjs — type aliases for primitives, unions, and function types
// Type aliases give meaningful names to types without creating new runtime values.
// Keep aliases simple: primitive wrappers, union shorthands, function signatures.

// --- Primitive aliases ---

type UserId   = number
type PostId   = number
type Email    = string
type Username = string
type Url      = string
type Timestamp = number   // Unix ms

// --- Union type aliases ---

type StringOrNumber = string | number
type BooleanOrNull  = boolean | null
type NumericId      = number | string   // covers both DB int and UUID string

// --- Function type aliases ---

type Callback<T>    = (value: T) => void
type Predicate<T>   = (value: T) => boolean
type Transform<A, B> = (input: A) => B
type Handler        = (event: string, data: dynamic) => void
type Comparator<T>  = (a: T, b: T) => number
type Reducer<S, A>  = (state: S, action: A) => S
type Thunk<T>       = () => T

// --- Using aliases in function signatures ---

function getUserById(id: UserId): Username {
  return "user_" + id
}

function sendEmail(to: Email, subject: string): void {
  console.log(`Sending "${subject}" to ${to}`)
}

function formatId(id: NumericId): string {
  if (typeof id === "number") return "n:" + id.toString()
  return "s:" + id
}

function applyIf<T>(value: T, pred: Predicate<T>, fn: Transform<T, T>): T {
  return pred(value) ? fn(value) : value
}

function mapList<T, U>(items: T[], fn: Transform<T, U>): U[] {
  return items.map(fn)
}

function buildHandler(prefix: string): Handler {
  return (event: string, data: dynamic) => {
    console.log(`[${prefix}] ${event}:`, data)
  }
}

function sortBy<T>(items: T[], cmp: Comparator<T>): T[] {
  return [...items].sort(cmp)
}

function reduce<S, A>(initial: S, actions: A[], reducer: Reducer<S, A>): S {
  let state = initial
  for (const action of actions) {
    state = reducer(state, action)
  }
  return state
}

function lazy<T>(fn: Thunk<T>): T {
  return fn()
}

// --- Demos ---

const uid: UserId = 42
console.log(getUserById(uid))  // user_42

sendEmail("alice@example.com", "Welcome!")  // Sending "Welcome!" to alice@example.com

console.log(formatId(100))    // n:100
console.log(formatId("abc"))  // s:abc

const doubled = applyIf(10, n => n > 5, n => n * 2)
console.log(doubled)   // 20

const filtered = applyIf(3, n => n > 5, n => n * 2)
console.log(filtered)  // 3 (predicate false, no transform)

const nums: number[] = [1, 2, 3, 4, 5]
const doubled2 = mapList<number, number>(nums, n => n * 2)
console.log(doubled2)  // [2, 4, 6, 8, 10]

const strs = mapList<number, string>(nums, n => "item" + n)
console.log(strs)  // ["item1","item2","item3","item4","item5"]

const handler = buildHandler("APP")
handler("click", { x: 10, y: 20 })  // [APP] click: { x: 10, y: 20 }

const words = ["banana", "apple", "cherry"]
const sorted = sortBy(words, (a, b) => a < b ? -1 : a > b ? 1 : 0)
console.log(sorted)  // ["apple","banana","cherry"]

type CountAction = | Increment | Decrement | Reset
const total = reduce(0, [Increment, Increment, Decrement, Increment], (s, a) => {
  return match a {
    Increment => s + 1
    Decrement => s - 1
    Reset     => 0
  }
})
console.log(total)  // 2

const result = lazy(() => 6 * 7)
console.log(result)  // 42
