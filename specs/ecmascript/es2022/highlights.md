# ECMAScript 2022 (ES13) — Highlights for Super.js

**Spec**: ECMA-262, 13th Edition | **TC39 release**: June 2022
**SJS relevance**: MOST IMPORTANT baseline version. ES2022 introduces the class field and private-field model that the SJS class system is built on. The `#` private syntax, class static blocks, and top-level await all have direct SJS semantics — this is the spec version that makes the SJS OOP model possible.

---

## 1. Private Class Fields and Methods — §15.7.1

### Why `#` instead of TypeScript's `private`

TypeScript's `private` keyword is **type-erased** — it is only a compile-time annotation. At runtime, TypeScript `private` fields are fully accessible JavaScript properties:

```typescript
// TypeScript: runtime accessible despite compile-time "private"
class Counter {
  private count = 0
}
const c = new Counter()
;(c as any).count   // 0 — TypeScript private is NOT private at runtime
```

SJS uses `#` — the ES2022 hard-private syntax — for **true runtime privacy**. Properties prefixed with `#` are stored in a brand-checked slot on the instance; no amount of casting, reflection, or `Object.keys` can reach them.

```sjs
// SJS class with genuine private fields
class BankAccount {
  #balance: number
  #owner: string

  constructor(owner: string, initial: number) {
    this.#owner   = owner
    this.#balance = initial
  }

  deposit(amount: number): void {
    if (amount <= 0) throw new Error("Amount must be positive")
    this.#balance += amount
  }

  withdraw(amount: number): void {
    if (amount > this.#balance) throw new Error("Insufficient funds")
    this.#balance -= amount
  }

  get balance(): number { return this.#balance }
  get owner(): string   { return this.#owner }

  // Private method — also truly private
  #formatBalance(): string {
    return `$${this.#balance.toFixed(2)}`
  }

  toString(): string {
    return `${this.#owner}: ${this.#formatBalance()}`
  }
}

const account = new BankAccount("Alice", 1_000)
account.deposit(500)
account.withdraw(200)
console.log(account.balance)   // 1300
// account.#balance             // SJS-E020: private field '#balance' is not accessible outside class
// (account as any).#balance    // Runtime SyntaxError — no cast escape hatch
```

### Brand checking with `#field in obj`

ES2022 adds `#field in obj` — a safe way to test whether an object was constructed by a specific class. This is more reliable than `instanceof` for cross-realm scenarios.

```sjs
class Measurement {
  #value: number
  #unit: string

  constructor(value: number, unit: string) {
    this.#value = value
    this.#unit  = unit
  }

  static isMeasurement(obj: unknown): obj is Measurement {
    return #value in (obj as object)
  }

  toSI(): number { return this.#value }
}

function process(input: unknown): number {
  if (Measurement.isMeasurement(input)) {
    return input.toSI()     // SJS narrows type here
  }
  throw new TypeError("Expected a Measurement")
}
```

---

## 2. Class Field Declarations — §15.7.1

Public and private field declarations may appear at the class body level, without assignment in the constructor. Fields are initialized in declaration order before the constructor body runs.

```sjs
// Typed field declarations — public and private
class EventEmitter<T> {
  #listeners: Map<string, Set<(data: T) => void>> = new Map()
  readonly version: string = "1.0.0"
  isDestroyed: boolean = false

  on(event: string, handler: (data: T) => void): void {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set())
    }
    this.#listeners.get(event)!.add(handler)
  }

  emit(event: string, data: T): void {
    this.#listeners.get(event)?.forEach(h => h(data))
  }

  off(event: string, handler: (data: T) => void): void {
    this.#listeners.get(event)?.delete(handler)
  }

  destroy(): void {
    this.#listeners.clear()
    this.isDestroyed = true
  }
}

// SJS checks field types at every assignment site
const emitter = new EventEmitter<{ userId: number }>()
emitter.on("login", ({ userId }) => console.log("User logged in:", userId))
emitter.emit("login", { userId: 42 })
// emitter.version = "2.0.0"   // SJS-E021: cannot assign to readonly field 'version'
```

---

## 3. Class Static Blocks — §15.7.1

A `static { ... }` block runs once when the class is evaluated, after static field initializers but before the class binding is exported. It can access private fields of the class (unlike external code) and is useful for complex static initialization, circular-dependency workarounds, and freezing static state.

```sjs
class Config {
  static readonly DEBUG:   boolean
  static readonly VERSION: string
  static readonly #secret: string

  static {
    // Runs at class evaluation time
    Config.DEBUG   = process.env.NODE_ENV !== "production"
    Config.VERSION = "2.1.0"
    Config.#secret = process.env.API_KEY ?? "dev-key"
    Object.freeze(Config)
  }

  static getSecret(): string {
    return Config.#secret   // private access is allowed inside static blocks
  }
}

// Cross-class private access (coordination pattern)
class Node<T> {
  #value: T
  #next: Node<T> | null = null
  static #count: number = 0

  constructor(value: T) {
    this.#value = value
    Node.#count++
  }

  static {
    // Register cleanup hook at class definition time
    if (typeof globalThis.addEventListener === "function") {
      globalThis.addEventListener("unload", () => {
        console.log(`Total nodes created: ${Node.#count}`)
      })
    }
  }

  get value(): T { return this.#value }
}
```

---

## 4. Top-Level Await — §16.2.1.1

ES modules (`.sjs` files with `import`/`export`) may use `await` at the top level, outside any async function. The module is paused at each top-level `await` and other importing modules wait for it to complete.

```sjs
// config.sjs — top-level await to load configuration before export
import { readFile } from "fs/promises"

const raw: string    = await readFile("./config.json", "utf-8")
const cfg: Config    = JSON.parse(raw) as Config

// These exports are only available after the await resolves
export const port:    number = cfg.port ?? 3000
export const dbUrl:   string = cfg.databaseUrl
export const debug:   boolean = cfg.debug ?? false

// database.sjs — sequential initialization with typed results
import { connect } from "./db"

export const db: Database = await connect({
  url:     dbUrl,
  timeout: 5_000,
})

// SJS type: top-level await is only valid in ES module context
// In CommonJS files (.sjs without import/export), SJS-E030 is emitted:
// "Top-level await is only allowed in ES modules. Add 'import' or 'export' to make this a module."
```

---

## 5. Array.prototype.at — §23.1.3.1

`at(index)` accepts negative indices (counting from the end) and returns the element at that position, or `undefined` if out of bounds. Eliminates the verbose `arr[arr.length - 1]` pattern.

```sjs
const scores: number[] = [10, 20, 30, 40, 50]

const last:       number | undefined = scores.at(-1)   // 50
const secondLast: number | undefined = scores.at(-2)   // 40
const first:      number | undefined = scores.at(0)    // 10
const oob:        number | undefined = scores.at(100)  // undefined

// SJS type: at() always returns T | undefined
// Narrowing required before use:
function safeLast<T>(arr: T[]): T {
  const item: T | undefined = arr.at(-1)
  if (item === undefined) throw new Error("Empty array")
  return item
}

// String.prototype.at works the same way — §22.1.3.1
const lang: string = "Super.js"
const lastChar: string | undefined = lang.at(-1)   // "s"
```

---

## 6. Object.hasOwn — §20.1.2.8

`Object.hasOwn(obj, key)` is a static method that replaces the verbose `Object.prototype.hasOwnProperty.call(obj, key)` pattern. It works correctly on objects without a prototype (created via `Object.create(null)`) where calling `.hasOwnProperty` would throw.

```sjs
// Old pattern — breaks on null-prototype objects
function hasKey_old(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

// ES2022 — clean and safe
function hasKey(obj: object, key: string): boolean {
  return Object.hasOwn(obj, key)
}

// SJS typed use: discriminating own vs inherited properties
interface Config {
  [key: string]: unknown
}

function mergeConfig(base: Config, override: Config): Config {
  const result: Config = { ...base }
  for (const key in override) {
    if (Object.hasOwn(override, key)) {
      result[key] = override[key]
    }
  }
  return result
}

// Null-prototype object — hasOwnProperty would throw
const store: Record<string, number> = Object.create(null)
store["count"] = 42
console.log(Object.hasOwn(store, "count"))    // true
console.log(Object.hasOwn(store, "missing"))  // false
```

---

## 7. Error.cause — §20.5.7.1

The `Error` constructor accepts an options object `{ cause: unknown }`. The `cause` property chains errors, preserving the full error context across re-throws without losing the original stack.

```sjs
// Typed error chain
class DatabaseError extends Error {
  readonly query: string

  constructor(message: string, query: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name  = "DatabaseError"
    this.query = query
  }
}

async function runQuery(sql: string): Promise<unknown[]> {
  try {
    return await db.execute(sql)
  } catch (err: unknown) {
    throw new DatabaseError(
      "Query execution failed",
      sql,
      { cause: err },   // preserves original error
    )
  }
}

// Unwrap cause chain for logging
function getRootCause(err: unknown): unknown {
  if (err instanceof Error && err.cause !== undefined) {
    return getRootCause(err.cause)
  }
  return err
}
```

---

## ES2022 and the SJS Class System

ES2022 is the specification version that defines the SJS class model. The combination of private fields (`#`), class field declarations, and static blocks provides:

1. **True encapsulation** — `#` fields cannot be accessed outside the class body by any runtime technique
2. **Brand checking** — `#field in obj` enables type-safe, cross-realm instance testing
3. **Declarative initialization** — fields declared at class body level are part of the class contract, not hidden in constructor code
4. **Static lifecycle hooks** — `static {}` blocks replace constructor-function patterns for class-level setup

### Complete SJS class example — all ES2022 features together

```sjs
class Repository<T extends { id: number }> {
  #items: Map<number, T> = new Map()
  #nextId: number = 1
  static #registry: Set<Repository<unknown>> = new Set()

  readonly name: string
  isReadOnly: boolean = false

  static {
    // Cleanup all repositories on process exit
    process.on("exit", () => Repository.#registry.forEach(r => r.#items.clear()))
  }

  constructor(name: string) {
    this.name = name
    Repository.#registry.add(this)
  }

  static isRepository(obj: unknown): obj is Repository<unknown> {
    return #items in (obj as object)
  }

  add(item: Omit<T, "id">): T {
    if (this.isReadOnly) throw new Error("Repository is read-only")
    const id: number = this.#nextId++
    const stored: T  = { ...item, id } as T
    this.#items.set(id, stored)
    return stored
  }

  find(id: number): T | undefined {
    return this.#items.get(id)
  }

  findAll(): T[] {
    return Array.from(this.#items.values())
  }

  get size(): number { return this.#items.size }
}
```

## ES2022 Compliance Summary for SJS

| Feature | SJS Parse | SJS Type-check | Emit ES5 | Emit ES2022 |
|---------|-----------|----------------|----------|-------------|
| `#` private fields | Yes | Yes (brand-checked) | Transformed (WeakMap) | Pass-through |
| `#field in obj` | Yes | Yes (type guard) | Transformed | Pass-through |
| Class field declarations | Yes | Yes | Transformed | Pass-through |
| Static blocks | Yes | Yes | Transformed | Pass-through |
| Top-level await | Yes | Yes (module ctx) | Not supported | Pass-through |
| `Array.at` | Yes | Yes (lib types) | Polyfill note | Pass-through |
| `Object.hasOwn` | Yes | Yes (lib types) | Polyfill note | Pass-through |
| `Error.cause` | Yes | Yes (lib types) | Partial (no option) | Pass-through |
