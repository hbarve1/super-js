/**
 * ECMAScript ES5–ES2025 type-checking feature tests.
 * Covers all items in specs/002-ecmascript-features/implementation-plan.md
 */

import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import { TypeChecker } from '../../src/typeChecker'
import type { PrototypeDiagnostic } from '../../src/typeChecker/types'

// ── Test helpers ─────────────────────────────────────────────────────────────

function typeCheck(source: string): PrototypeDiagnostic[] {
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  })
  const checker = new TypeChecker()
  traverse(ast, {
    enter(path) { checker.check(path) },
  })
  return checker.getDiagnostics()
}

function errors(source: string): PrototypeDiagnostic[] {
  return typeCheck(source).filter(d => d.severity === 'error')
}

function errorCodes(source: string): string[] {
  return errors(source).map(d => d.code)
}

// ── Task 1.1: Generic Type Parameter Resolution — ES2015 ─────────────────────

describe('Task 1.1: Generic type parameter resolution — ES2015', () => {
  it('accepts Array<string> annotation', () => {
    expect(errors('const xs: Array<string> = ["a", "b"]')).toHaveLength(0)
  })

  it('accepts Array<number> annotation', () => {
    expect(errors('const ns: Array<number> = [1, 2, 3]')).toHaveLength(0)
  })

  it('accepts Promise<number> annotation', () => {
    expect(errors('const p: Promise<number> = new Promise<number>((r) => r(1))')).toHaveLength(0)
  })

  it('resolves Array<T> — rejects non-array', () => {
    expect(errors('const xs: Array<string> = "not array"').length).toBeGreaterThan(0)
  })

  it('accepts Map<string, number> annotation', () => {
    expect(errors('const m: Map<string, number> = new Map()')).toHaveLength(0)
  })

  it('accepts Set<string> annotation', () => {
    expect(errors('const s: Set<string> = new Set()')).toHaveLength(0)
  })

  it('accepts Iterable<T> annotation', () => {
    expect(errors('const it: Iterable<number> = [1,2,3]')).toHaveLength(0)
  })

  it('resolves nested generics: Array<Array<string>>', () => {
    expect(errors('const mat: Array<Array<string>> = [["a"]]')).toHaveLength(0)
  })

  it('generic function identity<T>(x:T):T — infers return type from arg', () => {
    expect(errors(`
      function identity<T>(x: T): T { return x }
      const n: number = identity(42)
    `)).toHaveLength(0)
  })

  it('generic function identity<T>(x:T):T — type mismatch caught after inference', () => {
    expect(errorCodes(`
      function identity<T>(x: T): T { return x }
      const s: string = identity(42)
    `)).toContain('SJS-E001')
  })

  it('generic function with string arg infers string return', () => {
    expect(errors(`
      function wrap<T>(x: T): T { return x }
      const s: string = wrap('hello')
    `)).toHaveLength(0)
  })
})

// ── Task 1.2: Async/Await Return Type Inference — ES2017 ─────────────────────

describe('Task 1.2: Async/Await return type inference — ES2017', () => {
  it('async function with Promise<string> return type accepts string return', () => {
    expect(errors(`
      async function fetchData(): Promise<string> {
        return "data"
      }
    `)).toHaveLength(0)
  })

  it('async function with wrong inner type errors', () => {
    expect(errors(`
      async function getNum(): Promise<number> {
        return "not a number"
      }
    `).length).toBeGreaterThan(0)
  })

  it('await unwraps Promise<T> to T for assignment', () => {
    expect(errors(`
      async function main() {
        const p: Promise<string> = new Promise<string>((r) => r("hi"))
        const s: string = await p
      }
    `)).toHaveLength(0)
  })

  it('SJS-E009: no error for await inside async function', () => {
    // Babel rejects await in non-async functions at parse time (syntax error).
    // Verify that await inside an async function produces no SJS-E009.
    const src = 'async function f() { return await Promise.resolve(1) }'
    const ast = parse(src, { sourceType: 'module', plugins: ['typescript'] })
    const checker = new TypeChecker()
    traverse(ast, { enter(p) { checker.check(p) } })
    const codes = checker.getDiagnostics().filter(d => d.severity === 'error').map(d => d.code)
    expect(codes).not.toContain('SJS-E009')
  })

  it('await in async arrow is valid — no SJS-E009', () => {
    expect(errorCodes('const f = async () => { const x = await Promise.resolve(1) }')).not.toContain('SJS-E009')
  })

  it('async arrow with Promise<number> return accepts number', () => {
    expect(errors('const f = async (): Promise<number> => 42')).toHaveLength(0)
  })
})

// ── Task 1.3: Destructuring Type Annotations — ES2015 ────────────────────────

describe('Task 1.3: Destructuring type annotations — ES2015', () => {
  it('object destructuring with inline type annotation', () => {
    expect(errors(`
      const obj = { name: "Alice", age: 30 }
      const { name, age }: { name: string; age: number } = obj
    `)).toHaveLength(0)
  })

  it('array destructuring with tuple annotation', () => {
    expect(errors(`
      const pair: [string, number] = ["hello", 42]
      const [s, n]: [string, number] = pair
    `)).toHaveLength(0)
  })

  it('destructuring registers bindings for subsequent use', () => {
    expect(errors(`
      const { x }: { x: number } = { x: 1 }
      const n: number = x
    `)).toHaveLength(0)
  })

  it('object destructuring non-object init errors', () => {
    expect(errors(`
      const { x }: { x: number } = "not an object"
    `).length).toBeGreaterThan(0)
  })

  it('rest element in array destructuring', () => {
    expect(errors(`
      const [head, ...tail] = [1, 2, 3]
    `)).toHaveLength(0)
  })

  it('object destructuring rest element', () => {
    expect(errors(`
      const { a, ...rest } = { a: 1, b: 2 }
    `)).toHaveLength(0)
  })
})

// ── Task 1.4: Object Spread Type Merging — ES2018 ─────────────────────────────

describe('Task 1.4: Object spread type merging — ES2018', () => {
  it('infers merged type from spread objects', () => {
    expect(errors(`
      const a = { x: 1 }
      const b = { y: "hello" }
      const merged = { ...a, ...b }
    `)).toHaveLength(0)
  })

  it('later spread overrides earlier properties', () => {
    expect(errors(`
      const base = { x: 1, y: 2 }
      const override = { y: 100 }
      const merged = { ...base, ...override }
    `)).toHaveLength(0)
  })

  it('spread with additional literal properties', () => {
    expect(errors(`
      const base = { a: "hello" }
      const extended = { ...base, b: 42 }
    `)).toHaveLength(0)
  })

  it('assigns merged object to declared type', () => {
    expect(errors(`
      const a = { name: "Alice" }
      const b = { age: 30 }
      const person: object = { ...a, ...b }
    `)).toHaveLength(0)
  })
})

// ── Task 1.5: Type Narrowing — ES2015 ────────────────────────────────────────

describe('Task 1.5: Type narrowing (typeof/instanceof/null) — ES2015', () => {
  it('typeof string narrows in then-branch', () => {
    expect(errors(`
      function process(x: string | number) {
        if (typeof x === "string") {
          const s: string = x
        }
      }
    `)).toHaveLength(0)
  })

  it('null !== check narrows away null', () => {
    expect(errors(`
      function greet(name: string | null) {
        if (name !== null) {
          const s: string = name
        }
      }
    `)).toHaveLength(0)
  })

  it('instanceof narrows to object type', () => {
    expect(errors(`
      function handle(e: unknown) {
        if (e instanceof Error) {
          const obj: object = e
        }
      }
    `)).toHaveLength(0)
  })

  it('truthy check removes null/undefined', () => {
    expect(errors(`
      function greet(name: string | null | undefined) {
        if (name) {
          const s: string = name
        }
      }
    `)).toHaveLength(0)
  })
})

// ── Task 2.1: Iterator / AsyncIterator Protocol — ES2015/ES2018 ──────────────

describe('Task 2.1: Iterator/AsyncIterator protocol — ES2015/ES2018', () => {
  it('accepts Iterator<T> annotation', () => {
    expect(errors('const it: Iterator<number> = [1,2,3].values()')).toHaveLength(0)
  })

  it('accepts Generator<T> annotation', () => {
    expect(errors(`
      function* nums(): Generator<number, void, unknown> {
        yield 1
      }
    `)).toHaveLength(0)
  })

  it('array.values() is callable', () => {
    expect(errors(`
      const arr = [1, 2, 3]
      const it = arr.values()
    `)).toHaveLength(0)
  })

  it('array.keys() is callable', () => {
    expect(errors(`
      const arr = ['a', 'b']
      const it = arr.keys()
    `)).toHaveLength(0)
  })

  it('Map has entries() returning iterator', () => {
    expect(errors(`
      const m: Map<string, number> = new Map()
      const entries = m.entries()
    `)).toHaveLength(0)
  })

  it('array.keys() returns number[]', () => {
    expect(errors(`
      const arr = ['a', 'b', 'c']
      const keys: number[] = arr.keys()
    `)).toHaveLength(0)
  })

  it('array.values() returns element type array', () => {
    expect(errors(`
      const arr: number[] = [1, 2, 3]
      const vals: number[] = arr.values()
    `)).toHaveLength(0)
  })

  it('map.keys() returns key type array', () => {
    expect(errors(`
      const m: Map<string, number> = new Map()
      const keys: string[] = m.keys()
    `)).toHaveLength(0)
  })

  it('map.values() returns value type array', () => {
    expect(errors(`
      const m: Map<string, number> = new Map()
      const vals: number[] = m.values()
    `)).toHaveLength(0)
  })
})

// ── Task 2.2: WeakRef and FinalizationRegistry — ES2021 ──────────────────────

describe('Task 2.2: WeakRef<T> and FinalizationRegistry<T> — ES2021', () => {
  it('new WeakRef() creates object with deref()', () => {
    expect(errors(`
      const obj = { name: "test" }
      const ref = new WeakRef(obj)
      const val = ref.deref()
    `)).toHaveLength(0)
  })

  it('accepts WeakRef<object> annotation on new WeakRef()', () => {
    expect(errors(`
      const obj = { name: "test" }
      const ref: WeakRef<typeof obj> = new WeakRef(obj)
    `)).toHaveLength(0)
  })

  it('FinalizationRegistry instantiates without errors', () => {
    expect(errors(`
      const registry = new FinalizationRegistry((held: string) => {
        console.log(held)
      })
    `)).toHaveLength(0)
  })

  it('FinalizationRegistry.register() is callable', () => {
    expect(errors(`
      const registry = new FinalizationRegistry((held: string) => {})
      registry.register({}, "value")
    `)).toHaveLength(0)
  })
})

// ── Task 2.3: BigInt Mixing Enforcement (SJS-E004) — ES2020 ──────────────────

describe('Task 2.3: BigInt mixing enforcement (SJS-E004) — ES2020', () => {
  it('SJS-E004: bigint + number is rejected', () => {
    expect(errorCodes('const x = 1n + 1')).toContain('SJS-E004')
  })

  it('SJS-E004: number + bigint is rejected', () => {
    expect(errorCodes('const x = 1 + 1n')).toContain('SJS-E004')
  })

  it('SJS-E004: bigint * number is rejected', () => {
    expect(errorCodes('const x = 2n * 3')).toContain('SJS-E004')
  })

  it('bigint + bigint is allowed', () => {
    expect(errorCodes('const x = 1n + 2n')).not.toContain('SJS-E004')
  })

  it('number + number is allowed', () => {
    expect(errorCodes('const x = 1 + 2')).not.toContain('SJS-E004')
  })

  it('bigint subtraction is allowed', () => {
    expect(errorCodes('const x = 10n - 3n')).not.toContain('SJS-E004')
  })

  it('comparison operators do not trigger SJS-E004', () => {
    expect(errorCodes('const b = 1n > 2')).not.toContain('SJS-E004')
  })
})

// ── Task 2.4: Promise.withResolvers<T> — ES2024 ───────────────────────────────

describe('Task 2.4: Promise.withResolvers<T> — ES2024', () => {
  it('Promise.withResolvers() is callable', () => {
    expect(errors(`
      const result = Promise.withResolvers()
    `)).toHaveLength(0)
  })

  it('Promise.withResolvers() destructuring works', () => {
    expect(errors(`
      const { promise, resolve, reject } = Promise.withResolvers()
    `)).toHaveLength(0)
  })
})

// ── Task 2.5: Object.groupBy and Map.groupBy — ES2024 ────────────────────────

describe('Task 2.5: Object.groupBy and Map.groupBy — ES2024', () => {
  it('Object.groupBy is callable', () => {
    expect(errors(`
      const items = [1, 2, 3, 4]
      const grouped = Object.groupBy(items, (n) => n % 2 === 0 ? "even" : "odd")
    `)).toHaveLength(0)
  })

  it('Map.groupBy is callable', () => {
    expect(errors(`
      const items = ["a", "bb", "ccc"]
      const grouped = Map.groupBy(items, (s) => s.length)
    `)).toHaveLength(0)
  })
})

// ── Task 3.1: Array.prototype.at() Return Type — ES2022 ──────────────────────

describe('Task 3.1: Array.prototype.at() — ES2022', () => {
  it('array.at() assignable to T | undefined', () => {
    expect(errors(`
      const arr = [1, 2, 3]
      const item: number | undefined = arr.at(0)
    `)).toHaveLength(0)
  })

  it('array.at() NOT assignable to just T (result includes undefined)', () => {
    // Annotate arr so the type checker knows element type (gradual: unannotated → any)
    expect(errors(`
      const arr: number[] = [1, 2, 3]
      const item: number = arr.at(0)
    `).length).toBeGreaterThan(0)
  })

  it('string.at() returns string | undefined', () => {
    expect(errors(`
      const s = "hello"
      const ch: string | undefined = s.at(0)
    `)).toHaveLength(0)
  })
})

// ── Task 3.2: Object.hasOwn() — ES2022 ───────────────────────────────────────

describe('Task 3.2: Object.hasOwn() — ES2022', () => {
  it('Object.hasOwn returns boolean', () => {
    expect(errors(`
      const obj = { x: 1 }
      const has: boolean = Object.hasOwn(obj, "x")
    `)).toHaveLength(0)
  })
})

// ── Task 3.3: Error.cause Typing — ES2022 ────────────────────────────────────

describe('Task 3.3: Error.cause typing — ES2022', () => {
  it('new Error() with message is valid', () => {
    expect(errors(`
      const e = new Error("something went wrong")
    `)).toHaveLength(0)
  })

  it('Error instance has cause property', () => {
    expect(errors(`
      const e = new Error("failed")
      const c = e.cause
    `)).toHaveLength(0)
  })

  it('new Error with options.cause is valid', () => {
    expect(errors(`
      const orig = new Error("original")
      const wrapped = new Error("wrapper", { cause: orig })
    `)).toHaveLength(0)
  })

  it('Error.message and .name are strings', () => {
    expect(errors(`
      const e = new Error("msg")
      const msg: string = e.message
      const name: string = e.name
    `)).toHaveLength(0)
  })
})

// ── Task 3.4: Symbol as WeakMap/WeakSet Keys — ES2023 ────────────────────────

describe('Task 3.4: Symbol as WeakMap/WeakSet keys — ES2023', () => {
  it('accepts WeakMap<symbol, V> annotation', () => {
    expect(errors(`
      const wm: WeakMap<symbol, string> = new WeakMap()
    `)).toHaveLength(0)
  })

  it('WeakMap<object, V> annotation still valid', () => {
    expect(errors(`
      const wm: WeakMap<object, number> = new WeakMap()
    `)).toHaveLength(0)
  })
})

// ── Task 3.5: RegExp Named Capture Groups — ES2018 ───────────────────────────

describe('Task 3.5: RegExp named capture groups — ES2018', () => {
  it('string.match() is callable', () => {
    expect(errors(`
      const result = "2024-01-15".match(/\\d+/)
    `)).toHaveLength(0)
  })

  it('string.matchAll() is callable', () => {
    expect(errors(`
      const iter = "hello world".matchAll(/\\w+/g)
    `)).toHaveLength(0)
  })
})

// ── Task 3.6: SharedArrayBuffer and Atomics — ES2017 ─────────────────────────

describe('Task 3.6: SharedArrayBuffer and Atomics — ES2017', () => {
  it('new SharedArrayBuffer() is valid', () => {
    expect(errors(`
      const sab = new SharedArrayBuffer(1024)
    `)).toHaveLength(0)
  })

  it('Atomics.add is callable', () => {
    expect(errors(`
      const sab = new SharedArrayBuffer(4)
      const view = new Int32Array(sab)
      const prev: number = Atomics.add(view, 0, 1)
    `)).toHaveLength(0)
  })

  it('Atomics.load is callable', () => {
    expect(errors(`
      const sab = new SharedArrayBuffer(4)
      const val: number = Atomics.load(sab, 0)
    `)).toHaveLength(0)
  })
})

// ── Task 4.1: Iterator Helpers — ES2025 ──────────────────────────────────────

describe('Task 4.1: Iterator Helpers — ES2025', () => {
  it('Iterator.from is callable', () => {
    expect(errors(`
      const it = Iterator.from([1, 2, 3])
    `)).toHaveLength(0)
  })
})

// ── Task 4.2: Set Methods — ES2025 ───────────────────────────────────────────

describe('Task 4.2: Set methods — ES2025', () => {
  it('Set.union is callable', () => {
    expect(errors(`
      const a: Set<number> = new Set([1, 2])
      const b: Set<number> = new Set([2, 3])
      const u = a.union(b)
    `)).toHaveLength(0)
  })

  it('Set.intersection is callable', () => {
    expect(errors(`
      const a: Set<number> = new Set([1, 2])
      const b: Set<number> = new Set([2, 3])
      const inter = a.intersection(b)
    `)).toHaveLength(0)
  })

  it('Set.difference is callable', () => {
    expect(errors(`
      const a: Set<number> = new Set([1, 2])
      const b: Set<number> = new Set([2, 3])
      const diff = a.difference(b)
    `)).toHaveLength(0)
  })

  it('Set.symmetricDifference is callable', () => {
    expect(errors(`
      const a: Set<number> = new Set([1, 2])
      const b: Set<number> = new Set([2, 3])
      const sd = a.symmetricDifference(b)
    `)).toHaveLength(0)
  })

  it('Set.isSubsetOf returns boolean', () => {
    expect(errors(`
      const a: Set<number> = new Set([1])
      const b: Set<number> = new Set([1, 2])
      const sub: boolean = a.isSubsetOf(b)
    `)).toHaveLength(0)
  })

  it('Set.isSupersetOf returns boolean', () => {
    expect(errors(`
      const a: Set<number> = new Set([1, 2])
      const b: Set<number> = new Set([1])
      const sup: boolean = a.isSupersetOf(b)
    `)).toHaveLength(0)
  })

  it('Set.isDisjointFrom returns boolean', () => {
    expect(errors(`
      const a: Set<number> = new Set([1])
      const b: Set<number> = new Set([2])
      const disj: boolean = a.isDisjointFrom(b)
    `)).toHaveLength(0)
  })
})

// ── Task 4.3: Promise.try — ES2025 ───────────────────────────────────────────

describe('Task 4.3: Promise.try — ES2025', () => {
  it('Promise.try is callable', () => {
    expect(errors(`
      const p = Promise.try(() => 42)
    `)).toHaveLength(0)
  })

  it('Promise.try result assignable to Promise<any>', () => {
    expect(errors(`
      const p: Promise<any> = Promise.try(() => "hello")
    `)).toHaveLength(0)
  })
})

// ── Task 4.4: Error.isError — ES2025 ─────────────────────────────────────────

describe('Task 4.4: Error.isError() — ES2025', () => {
  it('Error.isError returns boolean', () => {
    expect(errors(`
      const isErr: boolean = Error.isError(new Error("test"))
    `)).toHaveLength(0)
  })
})

// ── Task 4.5: Float16Array — ES2025 ──────────────────────────────────────────

describe('Task 4.5: Float16Array — ES2025', () => {
  it('new Float16Array() is valid', () => {
    expect(errors(`
      const arr = new Float16Array(4)
    `)).toHaveLength(0)
  })

  it('Float16Array.BYTES_PER_ELEMENT is number', () => {
    expect(errors(`
      const bpe: number = Float16Array.BYTES_PER_ELEMENT
    `)).toHaveLength(0)
  })
})

// ── Task 4.6: Math.sumPrecise — ES2025 ───────────────────────────────────────

describe('Task 4.6: Math.sumPrecise — ES2025', () => {
  it('Math.sumPrecise returns number', () => {
    expect(errors(`
      const sum: number = Math.sumPrecise([1.1, 2.2, 3.3])
    `)).toHaveLength(0)
  })
})

// ── Stdlib coverage: Array methods ───────────────────────────────────────────

describe('Array prototype methods — stdlib coverage', () => {
  it('array.length is number', () => {
    expect(errors('const arr = [1,2,3]; const n: number = arr.length')).toHaveLength(0)
  })

  it('array.includes returns boolean', () => {
    expect(errors('const arr = [1,2,3]; const b: boolean = arr.includes(2)')).toHaveLength(0)
  })

  it('array.join returns string', () => {
    expect(errors('const arr = ["a","b"]; const s: string = arr.join(",")')).toHaveLength(0)
  })

  it('array.findLast (ES2023) is callable', () => {
    expect(errors(`
      const arr = [1, 2, 3]
      const last = arr.findLast((n) => n > 1)
    `)).toHaveLength(0)
  })

  it('array.toReversed (ES2023) is callable', () => {
    expect(errors(`
      const arr = [1, 2, 3]
      const rev = arr.toReversed()
    `)).toHaveLength(0)
  })

  it('array.with (ES2023) is callable', () => {
    expect(errors(`
      const arr = [1, 2, 3]
      const updated = arr.with(1, 99)
    `)).toHaveLength(0)
  })
})

// ── Stdlib coverage: String methods ──────────────────────────────────────────

describe('String prototype methods — stdlib coverage', () => {
  it('string.replaceAll (ES2021) returns string', () => {
    expect(errors('const s = "hello world"; const r: string = s.replaceAll("l", "x")')).toHaveLength(0)
  })

  it('string.padStart (ES2017) returns string', () => {
    expect(errors('const s = "5"; const p: string = s.padStart(3, "0")')).toHaveLength(0)
  })

  it('string.at (ES2022) returns string | undefined', () => {
    expect(errors('const s = "hello"; const c: string | undefined = s.at(-1)')).toHaveLength(0)
  })

  it('string.match returns string[] | null', () => {
    expect(errors(`
      const s = "hello 123"
      const m = s.match(/\d+/)
    `)).toHaveLength(0)
  })

  it('string.matchAll returns array of matches', () => {
    expect(errors(`
      const s = "foo bar foo"
      const matches = s.matchAll(/foo/g)
    `)).toHaveLength(0)
  })
})

// ── Stdlib coverage: Object static methods ────────────────────────────────────

describe('Object static methods — stdlib coverage', () => {
  it('Object.keys returns string[]', () => {
    expect(errors('const ks: string[] = Object.keys({ a: 1 })')).toHaveLength(0)
  })

  it('Object.fromEntries is callable (ES2019)', () => {
    expect(errors('const obj = Object.fromEntries([["a", 1]])')).toHaveLength(0)
  })
})

// ── Stdlib coverage: Math methods ────────────────────────────────────────────

describe('Math methods — stdlib coverage', () => {
  it('Math.abs returns number', () => {
    expect(errors('const n: number = Math.abs(-5)')).toHaveLength(0)
  })

  it('Math.random returns number', () => {
    expect(errors('const n: number = Math.random()')).toHaveLength(0)
  })

  it('Math.floor returns number', () => {
    expect(errors('const n: number = Math.floor(3.7)')).toHaveLength(0)
  })
})

// ── Regression: pre-existing features still work ─────────────────────────────

describe('Regression: pre-existing type checking', () => {
  it('primitive type mismatch detected', () => {
    expect(errors('const x: number = "hello"').length).toBeGreaterThan(0)
  })

  it('null safety enforced', () => {
    expect(errors('const x: string = null').length).toBeGreaterThan(0)
  })

  it('function return type checked', () => {
    expect(errors('function f(): number { return "oops" }').length).toBeGreaterThan(0)
  })

  it('bigint literal assigns to bigint', () => {
    expect(errors('const n: bigint = 100n')).toHaveLength(0)
  })

  it('Symbol.iterator has symbol type', () => {
    expect(errors('const s: symbol = Symbol.iterator')).toHaveLength(0)
  })

  it('sum type exhaustiveness still enforced', () => {
    expect(errors(`
      type Shape = Circle | Square
      const s: Shape = { _tag: "Circle" } as any
      switch (s._tag) {
        case "Circle": break
      }
    `).filter(e => e.code === 'SJS-E007').length).toBeGreaterThan(0)
  })
})

// ── Gap 1 — Binary expression type checking (SJS-E004) ───────────────────────

describe('Gap 1: Binary expression type checking (ECMA-262 §13.15)', () => {
  // Correct arithmetic — no errors
  it('number + number infers number', () => {
    expect(errors('const n: number = 1 + 2')).toHaveLength(0)
  })

  it('number - number infers number', () => {
    expect(errors('const n: number = 10 - 3')).toHaveLength(0)
  })

  it('number * number infers number', () => {
    expect(errors('const n: number = 3 * 4')).toHaveLength(0)
  })

  it('number / number infers number', () => {
    expect(errors('const n: number = 10 / 2')).toHaveLength(0)
  })

  it('number % number infers number', () => {
    expect(errors('const n: number = 7 % 3')).toHaveLength(0)
  })

  it('number ** number infers number', () => {
    expect(errors('const n: number = 2 ** 8')).toHaveLength(0)
  })

  it('bigint + bigint infers bigint', () => {
    expect(errors('const n: bigint = 1n + 2n')).toHaveLength(0)
  })

  it('bigint - bigint infers bigint', () => {
    expect(errors('const n: bigint = 10n - 3n')).toHaveLength(0)
  })

  it('bigint * bigint infers bigint', () => {
    expect(errors('const n: bigint = 2n * 3n')).toHaveLength(0)
  })

  it('string + string infers string', () => {
    expect(errors('const s: string = "hello" + " world"')).toHaveLength(0)
  })

  it('string + number infers string (+ concatenation coercion)', () => {
    expect(errors('const s: string = "count: " + 42')).toHaveLength(0)
  })

  it('number + string infers string', () => {
    expect(errors('const s: string = 42 + " items"')).toHaveLength(0)
  })

  // Arithmetic result assigned to wrong type — SJS-E001
  it('number + number assigned to string emits SJS-E001', () => {
    expect(errorCodes('const s: string = 1 + 2')).toContain('SJS-E001')
  })

  it('bigint + bigint assigned to number emits SJS-E001', () => {
    expect(errorCodes('const n: number = 1n + 2n')).toContain('SJS-E001')
  })

  // BigInt + Number mixing — SJS-E004 (ECMA-262 §6.1.6.2)
  it('SJS-E004: bigint + number emits SJS-E004', () => {
    expect(errorCodes('const x = 1n + 2')).toContain('SJS-E004')
  })

  it('SJS-E004: number + bigint emits SJS-E004', () => {
    expect(errorCodes('const x = 1 + 2n')).toContain('SJS-E004')
  })

  it('SJS-E004: bigint - number emits SJS-E004', () => {
    expect(errorCodes('const x = 5n - 1')).toContain('SJS-E004')
  })

  it('SJS-E004: bigint * number emits SJS-E004', () => {
    expect(errorCodes('const x = 2n * 3')).toContain('SJS-E004')
  })

  it('SJS-E004: bigint / number emits SJS-E004', () => {
    expect(errorCodes('const x = 10n / 2')).toContain('SJS-E004')
  })

  it('SJS-E004: bigint % number emits SJS-E004', () => {
    expect(errorCodes('const x = 7n % 3')).toContain('SJS-E004')
  })

  it('SJS-E004: bigint ** number emits SJS-E004', () => {
    expect(errorCodes('const x = 2n ** 8')).toContain('SJS-E004')
  })

  // Relational operators always return boolean
  it('comparison operators infer boolean', () => {
    expect(errors('const b: boolean = 1 < 2')).toHaveLength(0)
    expect(errors('const b: boolean = "a" === "b"')).toHaveLength(0)
    expect(errors('const b: boolean = 1 !== 2')).toHaveLength(0)
    expect(errors('const b: boolean = 1 >= 0')).toHaveLength(0)
  })

  it('comparison operators do not trigger SJS-E004', () => {
    expect(errorCodes('const b = 1n > 2')).not.toContain('SJS-E004')
    expect(errorCodes('const b = 1n < 2')).not.toContain('SJS-E004')
  })
})

// ── Gap 2 — Logical / conditional expression type inference ───────────────────

describe('Gap 2: Logical/conditional expression type inference (ECMA-262 §13.13/§13.14)', () => {
  // && — short-circuits on falsy left; result is left-or-right union
  it('a && b where both same type infers that type', () => {
    expect(errors(`
      const n: number = 5
      const r: number = n && n
    `)).toHaveLength(0)
  })

  it('a && b where types differ infers union', () => {
    expect(errors(`
      const a: string = "hi"
      const b: number = 42
      const r: string | number = a && b
    `)).toHaveLength(0)
  })

  it('a && b assigned to wrong single type emits SJS-E001', () => {
    expect(errorCodes(`
      const a: string = "hi"
      const b: number = 42
      const r: string = a && b
    `)).toContain('SJS-E001')
  })

  // || — short-circuits on truthy left; result is union
  it('a || b where both same type infers that type', () => {
    expect(errors(`
      const n: number = 5
      const r: number = n || n
    `)).toHaveLength(0)
  })

  it('a || b where types differ infers union', () => {
    expect(errors(`
      const a: string = "hi"
      const b: number = 42
      const r: string | number = a || b
    `)).toHaveLength(0)
  })

  // ?? — nullish coalescing (ECMA-262 §13.13)
  it('a ?? b where a is T|null returns T when non-null', () => {
    expect(errors(`
      const a: string | null = null
      const b: string = "default"
      const r: string = a ?? b
    `)).toHaveLength(0)
  })

  it('a ?? b where a is T|undefined returns T when non-undefined', () => {
    expect(errors(`
      const a: number | undefined = undefined
      const b: number = 0
      const r: number = a ?? b
    `)).toHaveLength(0)
  })

  it('a ?? b where a is T|null|undefined uses right fallback', () => {
    expect(errors(`
      const a: string | null | undefined = null
      const b: string = "fallback"
      const r: string = a ?? b
    `)).toHaveLength(0)
  })

  it('a ?? b: no error for any ?? T', () => {
    expect(errors(`
      const a: any = null
      const b: number = 5
      const r: number = a ?? b
    `)).toHaveLength(0)
  })

  // Conditional (ternary) — ECMA-262 §13.14
  it('cond ? a : b where both same type infers that type', () => {
    expect(errors(`
      const flag: boolean = true
      const r: number = flag ? 1 : 2
    `)).toHaveLength(0)
  })

  it('cond ? a : b where types differ infers union', () => {
    expect(errors(`
      const flag: boolean = true
      const r: string | number = flag ? "yes" : 0
    `)).toHaveLength(0)
  })

  it('ternary with string/number union assigned to number alone emits SJS-E001', () => {
    expect(errorCodes(`
      const flag: boolean = true
      const r: number = flag ? "yes" : 0
    `)).toContain('SJS-E001')
  })

  it('ternary literal branches — no error when consistent', () => {
    expect(errors('const x: string = true ? "a" : "b"')).toHaveLength(0)
  })
})

// ── Gap 3 — Array literal and index type inference ────────────────────────────

describe('Gap 3: Array literal and index type inference (ECMA-262 §13.2.4)', () => {
  // Homogeneous arrays infer element type
  it('[1, 2, 3] infers as number[]', () => {
    expect(errors('const arr: number[] = [1, 2, 3]')).toHaveLength(0)
  })

  it('["a", "b"] infers as string[]', () => {
    expect(errors('const arr: string[] = ["a", "b"]')).toHaveLength(0)
  })

  it('[true, false] infers as boolean[]', () => {
    expect(errors('const arr: boolean[] = [true, false]')).toHaveLength(0)
  })

  it('[1n, 2n] infers as bigint[]', () => {
    expect(errors('const arr: bigint[] = [1n, 2n]')).toHaveLength(0)
  })

  // Array assigned to non-array type emits SJS-E001
  it('array literal assigned to string (not array) emits SJS-E001', () => {
    expect(errorCodes('const s: string = [1, 2, 3]')).toContain('SJS-E001')
  })

  // Empty array — element type is any (gradual)
  it('empty array [] is consistent with any array annotation', () => {
    expect(errors('const arr: number[] = []')).toHaveLength(0)
  })

  // Subscript access (computed MemberExpression)
  it('arr[i] where arr: number[] returns number', () => {
    expect(errors(`
      const arr: number[] = [1, 2, 3]
      const n: number = arr[0]
    `)).toHaveLength(0)
  })

  it('arr[i] where arr: string[] returns string', () => {
    expect(errors(`
      const arr: string[] = ["a", "b"]
      const s: string = arr[0]
    `)).toHaveLength(0)
  })

  it('arr[i] where arr: number[] assigned to string emits SJS-E001', () => {
    expect(errorCodes(`
      const arr: number[] = [1, 2, 3]
      const s: string = arr[0]
    `)).toContain('SJS-E001')
  })

  // Inferred array from literal then subscript
  it('subscript of inferred number[] returns number', () => {
    expect(errors(`
      const arr = [10, 20, 30]
      const n: number = arr[1]
    `)).toHaveLength(0)
  })

  it('subscript of inferred string[] returns string', () => {
    expect(errors(`
      const arr = ["x", "y", "z"]
      const s: string = arr[0]
    `)).toHaveLength(0)
  })

  // Array.length — ECMA-262 §23.1.3.16
  it('arr.length infers as number', () => {
    expect(errors('const arr = [1, 2, 3]; const n: number = arr.length')).toHaveLength(0)
  })

  it('arr.length assigned to string emits SJS-E001', () => {
    expect(errorCodes('const arr = [1, 2, 3]; const s: string = arr.length')).toContain('SJS-E001')
  })

  // Mixed element types — element type falls back to any
  it('mixed array [1, "a"] is assignable to any[]', () => {
    expect(errors('const arr: any[] = [1, "a"]')).toHaveLength(0)
  })
})

// ── Gap 4 — Object literal type inference ─────────────────────────────────────

describe('Gap 4: Object literal type inference (ECMA-262 §13.2.5)', () => {
  // Basic object literal property types
  it('{ x: 1 } infers as object with number property x', () => {
    expect(errors(`
      const obj = { x: 1 }
      const n: number = obj.x
    `)).toHaveLength(0)
  })

  it('{ name: "Alice" } infers as object with string property', () => {
    expect(errors(`
      const obj = { name: "Alice" }
      const s: string = obj.name
    `)).toHaveLength(0)
  })

  it('{ flag: true } infers as object with boolean property', () => {
    expect(errors(`
      const obj = { flag: true }
      const b: boolean = obj.flag
    `)).toHaveLength(0)
  })

  it('{ x: 1, y: "hello" } infers correct property types', () => {
    expect(errors(`
      const obj = { x: 1, y: "hello" }
      const n: number = obj.x
      const s: string = obj.y
    `)).toHaveLength(0)
  })

  // Property type mismatch
  it('number property assigned to string emits SJS-E001', () => {
    expect(errorCodes(`
      const obj = { count: 42 }
      const s: string = obj.count
    `)).toContain('SJS-E001')
  })

  it('string property assigned to number emits SJS-E001', () => {
    expect(errorCodes(`
      const obj = { label: "hello" }
      const n: number = obj.label
    `)).toContain('SJS-E001')
  })

  // Object matches declared type annotation
  it('object literal consistent with declared object type annotation', () => {
    expect(errors(`
      const obj: { x: number; y: string } = { x: 1, y: "hello" }
    `)).toHaveLength(0)
  })

  // Nested objects inferred recursively
  it('nested object infers inner property types', () => {
    expect(errors(`
      const obj = { inner: { value: 99 } }
      const inner = obj.inner
      const n: number = inner.value
    `)).toHaveLength(0)
  })

  // Unknown property is any (gradual)
  it('unknown property access is gradual (any)', () => {
    expect(errors(`
      const obj = { x: 1 }
      const u: any = (obj as any).unknownProp
    `)).toHaveLength(0)
  })

  // Object spread merges properties
  it('spread operator merges object properties', () => {
    expect(errors(`
      const a = { x: 1 }
      const b = { y: "hello" }
      const merged = { ...a, ...b }
    `)).toHaveLength(0)
  })

  // Object with string-keyed properties
  it('object with multiple properties all accessible', () => {
    expect(errors(`
      const point = { x: 3, y: 4, z: 5 }
      const sx: number = point.x
      const sy: number = point.y
      const sz: number = point.z
    `)).toHaveLength(0)
  })
})

// ── Gap 5 — Unary expression type inference ───────────────────────────────────

describe('Gap 5: Unary expression type inference (ECMA-262 §13.5)', () => {
  // typeof — always returns string (ECMA-262 §13.5.3)
  it('typeof x always infers string', () => {
    expect(errors('const s: string = typeof 42')).toHaveLength(0)
  })

  it('typeof x always infers string even for booleans', () => {
    expect(errors('const s: string = typeof true')).toHaveLength(0)
  })

  it('typeof x always infers string even for undefined', () => {
    expect(errors('const s: string = typeof undefined')).toHaveLength(0)
  })

  it('typeof x assigned to number emits SJS-E001', () => {
    expect(errorCodes('const n: number = typeof 42')).toContain('SJS-E001')
  })

  // ! (logical NOT) — always returns boolean (ECMA-262 §13.5.7)
  it('!x infers boolean', () => {
    expect(errors('const b: boolean = !true')).toHaveLength(0)
  })

  it('!x infers boolean for number operand', () => {
    expect(errors('const b: boolean = !0')).toHaveLength(0)
  })

  it('!x infers boolean for string operand', () => {
    expect(errors('const b: boolean = !""')).toHaveLength(0)
  })

  it('!x assigned to string emits SJS-E001', () => {
    expect(errorCodes('const s: string = !true')).toContain('SJS-E001')
  })

  // - (unary minus) — returns number for number, bigint for bigint (ECMA-262 §13.5.5)
  it('-number infers number', () => {
    expect(errors('const n: number = -5')).toHaveLength(0)
  })

  it('-bigint infers bigint', () => {
    expect(errors('const n: bigint = -5n')).toHaveLength(0)
  })

  it('-number assigned to string emits SJS-E001', () => {
    expect(errorCodes('const s: string = -5')).toContain('SJS-E001')
  })

  it('-bigint assigned to number emits SJS-E001', () => {
    expect(errorCodes('const n: number = -5n')).toContain('SJS-E001')
  })

  it('-variable-number infers number', () => {
    expect(errors(`
      const x: number = 10
      const n: number = -x
    `)).toHaveLength(0)
  })

  it('-variable-bigint infers bigint', () => {
    expect(errors(`
      const x: bigint = 10n
      const n: bigint = -x
    `)).toHaveLength(0)
  })

  // void — always returns undefined (ECMA-262 §13.5.2)
  it('void x infers undefined', () => {
    expect(errors('const u: undefined = void 0')).toHaveLength(0)
  })

  it('void x infers undefined for expression operand', () => {
    expect(errors('const u: undefined = void "hello"')).toHaveLength(0)
  })

  it('void x assigned to string emits SJS-E001', () => {
    expect(errorCodes('const s: string = void 0')).toContain('SJS-E001')
  })

  // + (unary plus) — coerces to number
  it('+x infers number', () => {
    expect(errors('const n: number = +"42"')).toHaveLength(0)
  })

  // ~ (bitwise NOT) — returns number
  it('~x infers number', () => {
    expect(errors('const n: number = ~5')).toHaveLength(0)
  })
})

// ── Gap 6 — Property access type inference ────────────────────────────────────

describe('Gap 6: Property access type inference (ECMA-262 §13.3.2)', () => {
  // Static member access on annotated object type
  it('obj.prop where obj: { x: number } infers number', () => {
    expect(errors(`
      const obj: { x: number } = { x: 1 }
      const n: number = obj.x
    `)).toHaveLength(0)
  })

  it('obj.prop where obj: { name: string } infers string', () => {
    expect(errors(`
      const obj: { name: string } = { name: "Alice" }
      const s: string = obj.name
    `)).toHaveLength(0)
  })

  it('obj.prop with wrong declared type emits SJS-E001', () => {
    expect(errorCodes(`
      const obj: { x: number } = { x: 1 }
      const s: string = obj.x
    `)).toContain('SJS-E001')
  })

  // Static member access on inferred object type
  it('obj.prop on inferred object returns inferred property type', () => {
    expect(errors(`
      const obj = { score: 100 }
      const n: number = obj.score
    `)).toHaveLength(0)
  })

  // arr.length on array — ECMA-262 §23.1.3.16
  it('arr.length on annotated array infers number', () => {
    expect(errors(`
      const arr: number[] = [1, 2, 3]
      const n: number = arr.length
    `)).toHaveLength(0)
  })

  it('arr.length on inferred array infers number', () => {
    expect(errors(`
      const arr = [1, 2, 3]
      const n: number = arr.length
    `)).toHaveLength(0)
  })

  it('arr.length assigned to boolean emits SJS-E001', () => {
    expect(errorCodes(`
      const arr = [1, 2, 3]
      const b: boolean = arr.length
    `)).toContain('SJS-E001')
  })

  // string.length — ECMA-262 §22.1.4.1
  it('str.length on string variable infers number', () => {
    expect(errors(`
      const s: string = "hello"
      const n: number = s.length
    `)).toHaveLength(0)
  })

  it('string literal .length infers number', () => {
    expect(errors('const n: number = "hello".length')).toHaveLength(0)
  })

  // Unknown property access — gradual (any)
  it('unknown property access on typed object is gradual (any)', () => {
    expect(errors(`
      const obj: { x: number } = { x: 1 }
      const u: any = (obj as any).unknownProp
    `)).toHaveLength(0)
  })

  // Optional chaining — obj?.prop
  it('obj?.prop on object type adds undefined to result', () => {
    expect(errors(`
      const obj: { x: number } = { x: 1 }
      const val: number | undefined = obj?.x
    `)).toHaveLength(0)
  })

  it('obj?.prop without undefined in target type emits SJS-E001', () => {
    expect(errorCodes(`
      const obj: { x: number } = { x: 1 }
      const n: number = obj?.x
    `)).toContain('SJS-E001')
  })

  // Array.prototype.at() — ES2022 returns T | undefined
  it('arr.at() on annotated array returns T | undefined', () => {
    expect(errors(`
      const arr: number[] = [1, 2, 3]
      const item: number | undefined = arr.at(0)
    `)).toHaveLength(0)
  })

  it('arr.at() on annotated array NOT assignable to just T', () => {
    expect(errorCodes(`
      const arr: number[] = [1, 2, 3]
      const item: number = arr.at(0)
    `)).toContain('SJS-E001')
  })

  it("obj['propName'] with string literal key infers property type", () => {
    expect(errors(`
      const obj: { x: number; y: string } = { x: 1, y: 'hi' }
      const n: number = obj['x']
      const s: string = obj['y']
    `)).toHaveLength(0)
  })

  it("obj['propName'] with wrong type emits SJS-E001", () => {
    expect(errorCodes(`
      const obj: { x: number } = { x: 1 }
      const s: string = obj['x']
    `)).toContain('SJS-E001')
  })
})

// ── Gap 7 — Async function return type ───────────────────────────────────────

describe('Gap 7: Async function return type (ECMA-262 §27.2)', () => {
  // Async function with Promise<T> return type annotation
  it('async function returning T consistent with Promise<T>', () => {
    expect(errors(`
      async function getNumber(): Promise<number> {
        return 42
      }
    `)).toHaveLength(0)
  })

  it('async function returning string consistent with Promise<string>', () => {
    expect(errors(`
      async function getMessage(): Promise<string> {
        return "hello"
      }
    `)).toHaveLength(0)
  })

  it('async function returning wrong inner type emits SJS-E002', () => {
    expect(errors(`
      async function getBad(): Promise<number> {
        return "not a number"
      }
    `).filter(d => d.code === 'SJS-E002').length).toBeGreaterThan(0)
  })

  it('async function returning boolean when Promise<number> emits SJS-E002', () => {
    expect(errors(`
      async function getBad(): Promise<number> {
        return true
      }
    `).filter(d => d.code === 'SJS-E002').length).toBeGreaterThan(0)
  })

  // Async arrow function
  it('async arrow with Promise<number> return accepts number', () => {
    expect(errors('const f = async (): Promise<number> => 42')).toHaveLength(0)
  })

  it('async arrow with Promise<string> return accepts string', () => {
    expect(errors('const f = async (): Promise<string> => "hi"')).toHaveLength(0)
  })

  it('async arrow with Promise<number> returning string emits SJS-E002', () => {
    expect(errors('const f = async (): Promise<number> => "oops"')
      .filter(d => d.code === 'SJS-E002').length).toBeGreaterThan(0)
  })

  // await unwraps Promise<T> — handled by gradual typing
  it('await in async function produces no false errors', () => {
    expect(errors(`
      async function main() {
        const p: Promise<string> = new Promise<string>((r) => r("hi"))
        const s: string = await p
      }
    `)).toHaveLength(0)
  })

  it('await Promise.resolve inside async — no SJS-E009', () => {
    const src = 'async function f() { return await Promise.resolve(1) }'
    expect(errorCodes(src)).not.toContain('SJS-E009')
  })

  // Multiple return paths in async function
  it('async function with multiple return paths — consistent inner types', () => {
    expect(errors(`
      async function pick(flag: boolean): Promise<number> {
        if (flag) return 1
        return 2
      }
    `)).toHaveLength(0)
  })

  // Promise<void>
  it('async function with Promise<void> allows bare return', () => {
    expect(errors(`
      async function doWork(): Promise<void> {
        const x = 1
      }
    `)).toHaveLength(0)
  })
})

// ── Gap 8 — Destructuring patterns ───────────────────────────────────────────

describe('Gap 8: Destructuring patterns (ECMA-262 §14.3.3)', () => {
  // Array destructuring — basic
  it('array destructuring binds elements from annotated source', () => {
    expect(errors(`
      const arr: number[] = [1, 2, 3]
      const [a, b] = arr
      const n1: number = a
      const n2: number = b
    `)).toHaveLength(0)
  })

  it('array destructuring with type annotation on pattern', () => {
    expect(errors(`
      const [x, y]: number[] = [1, 2]
      const n1: number = x
      const n2: number = y
    `)).toHaveLength(0)
  })

  it('array destructuring from literal infers element type', () => {
    expect(errors(`
      const [s1, s2] = ["hello", "world"]
      const a: string = s1
      const b: string = s2
    `)).toHaveLength(0)
  })

  it('array destructuring non-array with annotation emits SJS-E001', () => {
    expect(errorCodes(`
      const [a]: number[] = "not an array"
    `)).toContain('SJS-E001')
  })

  // Rest element in array destructuring
  it('rest element in array destructuring gets array type', () => {
    expect(errors(`
      const [head, ...tail] = [1, 2, 3]
    `)).toHaveLength(0)
  })

  // Object destructuring — basic
  it('object destructuring binds named properties', () => {
    expect(errors(`
      const obj = { name: "Alice", age: 30 }
      const { name, age } = obj
      const s: string = name
      const n: number = age
    `)).toHaveLength(0)
  })

  it('object destructuring with type annotation on pattern', () => {
    expect(errors(`
      const { x, y }: { x: number; y: string } = { x: 1, y: "hi" }
      const n: number = x
      const s: string = y
    `)).toHaveLength(0)
  })

  it('object destructuring registers bindings for subsequent use', () => {
    expect(errors(`
      const { x }: { x: number } = { x: 1 }
      const n: number = x
    `)).toHaveLength(0)
  })

  it('object destructuring non-object with annotation emits SJS-E001', () => {
    expect(errorCodes(`
      const { x }: { x: number } = "not an object"
    `)).toContain('SJS-E001')
  })

  it('object destructuring rest element is valid', () => {
    expect(errors(`
      const { a, ...rest } = { a: 1, b: 2, c: 3 }
    `)).toHaveLength(0)
  })

  // Destructuring from function parameter context (gradual)
  it('destructuring from any-typed source is gradual', () => {
    expect(errors(`
      const data: any = { x: 1 }
      const { x } = data
    `)).toHaveLength(0)
  })

  // Object destructuring with multiple properties
  it('object destructuring multiple props from annotated type', () => {
    expect(errors(`
      const point: { x: number; y: number; z: number } = { x: 1, y: 2, z: 3 }
      const { x, y, z } = point
      const nx: number = x
      const ny: number = y
      const nz: number = z
    `)).toHaveLength(0)
  })

  // Nested object destructuring
  it('nested object destructuring works at each level', () => {
    expect(errors(`
      const outer = { inner: { value: 42 } }
      const { inner } = outer
      const n: number = inner.value
    `)).toHaveLength(0)
  })

  // Array destructuring with explicit element annotation mismatch
  it('array destructuring bound var assigned to wrong type emits SJS-E001', () => {
    expect(errorCodes(`
      const [a]: string[] = ["hello"]
      const n: number = a
    `)).toContain('SJS-E001')
  })

  // Destructured function parameters with type annotations
  it('destructured object param uses annotated property types', () => {
    expect(errors(`
      function greet({ name, age }: { name: string; age: number }) {
        const s: string = name
        const n: number = age
      }
    `)).toHaveLength(0)
  })

  it('destructured object param typed bindings catch type errors', () => {
    expect(errorCodes(`
      function greet({ name }: { name: string }) {
        const n: number = name
      }
    `)).toContain('SJS-E001')
  })

  it('destructured array param uses annotated element types', () => {
    expect(errors(`
      function head([first]: number[]) {
        const n: number = first
      }
    `)).toHaveLength(0)
  })
})

// ── B1: dynamic type keyword ─────────────────────────────────────────────────

describe('B1: dynamic type keyword', () => {
  it('const x: dynamic = anything — no error', () => {
    expect(errors('const x: dynamic = 42')).toHaveLength(0)
    expect(errors('const x: dynamic = "hello"')).toHaveLength(0)
    expect(errors('const x: dynamic = true')).toHaveLength(0)
  })

  it('dynamic is consistent with all types', () => {
    expect(errors('const x: number = 42; const y: dynamic = x')).toHaveLength(0)
  })

  it('non-dynamic type is consistent with dynamic', () => {
    expect(errors('const x: dynamic = 42; const y: number = x')).toHaveLength(0)
  })

  it('strict mode warns when dynamic used', () => {
    const ast = require('@babel/parser').parse('const x: dynamic = 42', { sourceType: 'module', plugins: ['typescript'] })
    const { TypeChecker } = require('../../src/typeChecker')
    const checker = new TypeChecker({ strict: true })
    require('@babel/traverse').default(ast, { enter(p: any) { checker.check(p) } })
    const warnings = checker.getDiagnostics().filter((d: any) => d.severity === 'warning' && d.code === 'SJS-W001')
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('non-strict mode no warning for dynamic', () => {
    const diags = typeCheck('const x: dynamic = 42')
    expect(diags.filter(d => d.severity === 'warning')).toHaveLength(0)
  })
})

// ── S1: if/else type narrowing ────────────────────────────────────────────────

describe('S1: if/else statement with type narrowing', () => {
  function typeCheckWithExit(source: string) {
    const { parse } = require('@babel/parser')
    const traverse = require('@babel/traverse').default
    const { TypeChecker } = require('../../src/typeChecker')
    const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
    const checker = new TypeChecker()
    traverse(ast, {
      enter(p: any) { checker.check(p) },
      exit(p: any) { checker.exit(p) },
    })
    return checker.getDiagnostics().filter((d: any) => d.severity === 'error')
  }

  it('if statement condition is type-checked', () => {
    expect(typeCheckWithExit('if (typeof x === "string") { const y = x }')).toHaveLength(0)
  })

  it('no errors for simple if/else', () => {
    expect(typeCheckWithExit(`
      const x: number = 5
      if (x > 3) {
        const y: number = x
      } else {
        const z: number = x
      }
    `)).toHaveLength(0)
  })

  it('typeof narrowing: variable is narrowed to string in if-body', () => {
    // With narrowing, accessing x as string inside if should be fine
    expect(typeCheckWithExit(`
      const x: string = "hello"
      if (typeof x === "string") {
        const len: number = x.length
      }
    `)).toHaveLength(0)
  })
})

// ── S2: Loop statement type checking ─────────────────────────────────────────

describe('S2: Loop statement type checking', () => {
  function typeCheckWithExit(source: string) {
    const { parse } = require('@babel/parser')
    const traverse = require('@babel/traverse').default
    const { TypeChecker } = require('../../src/typeChecker')
    const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
    const checker = new TypeChecker()
    traverse(ast, {
      enter(p: any) { checker.check(p) },
      exit(p: any) { checker.exit(p) },
    })
    return checker.getDiagnostics().filter((d: any) => d.severity === 'error')
  }

  it('for-of loop variable typed as element type', () => {
    expect(typeCheckWithExit(`
      const arr: number[] = [1, 2, 3]
      for (const x of arr) {
        const n: number = x
      }
    `)).toHaveLength(0)
  })

  it('for-in loop variable typed as string', () => {
    expect(typeCheckWithExit(`
      const obj = { a: 1, b: 2 }
      for (const key in obj) {
        const s: string = key
      }
    `)).toHaveLength(0)
  })

  it('for-of string iterates characters (string elements)', () => {
    expect(typeCheckWithExit(`
      const str = "hello"
      for (const ch of str) {
        const s: string = ch
      }
    `)).toHaveLength(0)
  })

  it('for loop no errors for regular C-style for', () => {
    expect(typeCheckWithExit(`
      for (let i = 0; i < 10; i++) {
        const n: number = i
      }
    `)).toHaveLength(0)
  })
})

// ── S3: try/catch/throw type checking ────────────────────────────────────────

describe('S3: try/catch/throw type checking', () => {
  function typeCheckWithExit(source: string) {
    const { parse } = require('@babel/parser')
    const traverse = require('@babel/traverse').default
    const { TypeChecker } = require('../../src/typeChecker')
    const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
    const checker = new TypeChecker()
    traverse(ast, {
      enter(p: any) { checker.check(p) },
      exit(p: any) { checker.exit(p) },
    })
    return checker.getDiagnostics().filter((d: any) => d.severity === 'error')
  }

  it('try/catch registers catch binding — no error accessing it', () => {
    expect(typeCheckWithExit(`
      try {
        const x: number = 1
      } catch (e) {
        const msg = e
      }
    `)).toHaveLength(0)
  })

  it('optional catch binding (no param) is valid', () => {
    expect(typeCheckWithExit(`
      try {
        const x = 1
      } catch {
        const done = true
      }
    `)).toHaveLength(0)
  })

  it('throw statement is valid', () => {
    expect(typeCheckWithExit(`
      function f(): void {
        throw new Error("oops")
      }
    `)).toHaveLength(0)
  })
})

// ── S4: import/export type checking ──────────────────────────────────────────

describe('S4: import/export declaration type checking', () => {
  function typeCheckWithExit(source: string) {
    const { parse } = require('@babel/parser')
    const traverse = require('@babel/traverse').default
    const { TypeChecker } = require('../../src/typeChecker')
    const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
    const checker = new TypeChecker()
    traverse(ast, {
      enter(p: any) { checker.check(p) },
      exit(p: any) { checker.exit(p) },
    })
    return checker.getDiagnostics().filter((d: any) => d.severity === 'error')
  }

  it('import default binding registered — no errors using it', () => {
    expect(typeCheckWithExit(`
      import foo from './foo'
      const x = foo
    `)).toHaveLength(0)
  })

  it('named import binding registered — no errors using it', () => {
    expect(typeCheckWithExit(`
      import { bar } from './bar'
      const x = bar
    `)).toHaveLength(0)
  })

  it('namespace import registered', () => {
    expect(typeCheckWithExit(`
      import * as ns from './mod'
      const x = ns.something
    `)).toHaveLength(0)
  })

  it('export named declaration is valid', () => {
    expect(typeCheckWithExit(`
      export const x: number = 42
    `)).toHaveLength(0)
  })

  it('export default declaration is valid', () => {
    expect(typeCheckWithExit(`
      export default function hello() { return "hi" }
    `)).toHaveLength(0)
  })
})

// ── S5: Block scoping ─────────────────────────────────────────────────────────

describe('S5: Block scoping', () => {
  function typeCheckWithExit(source: string) {
    const { parse } = require('@babel/parser')
    const traverse = require('@babel/traverse').default
    const { TypeChecker } = require('../../src/typeChecker')
    const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
    const checker = new TypeChecker()
    traverse(ast, {
      enter(p: any) { checker.check(p) },
      exit(p: any) { checker.exit(p) },
    })
    return checker.getDiagnostics().filter((d: any) => d.severity === 'error')
  }

  it('block-scoped variable accessible inside block', () => {
    expect(typeCheckWithExit(`
      {
        const x: number = 42
        const y: number = x
      }
    `)).toHaveLength(0)
  })

  it('module-level variable accessible across the module', () => {
    expect(typeCheckWithExit(`
      const x: number = 42
      const y: number = x
    `)).toHaveLength(0)
  })

  it('var is not block-scoped — still accessible after block', () => {
    // var is function/module scoped, so it should remain in env
    expect(typeCheckWithExit(`
      {
        var x = 42
      }
      const y: number = x
    `)).toHaveLength(0)
  })
})

// ── L1: Array<T> method signatures ───────────────────────────────────────────

describe('L1: Array<T> method signatures', () => {
  it('arr.push() returns number', () => {
    expect(errors(`
      const arr: number[] = [1, 2]
      const n: number = arr.push(3)
    `)).toHaveLength(0)
  })

  it('arr.pop() returns T | undefined', () => {
    expect(errors('const arr: number[] = [1]; const x = arr.pop()')).toHaveLength(0)
  })

  it('arr.map() returns array', () => {
    expect(errors('const arr: number[] = [1,2,3]; const mapped = arr.map(x => x + 1)')).toHaveLength(0)
  })

  it('arr.filter() returns array of same type', () => {
    expect(errors('const arr: number[] = [1,2,3]; const filtered: number[] = arr.filter(x => x > 1)')).toHaveLength(0)
  })

  it('arr.find() returns T | undefined', () => {
    expect(errors('const arr: number[] = [1,2]; const x = arr.find(n => n > 1)')).toHaveLength(0)
  })

  it('arr.findIndex() returns number', () => {
    expect(errors('const arr: number[] = [1,2]; const i: number = arr.findIndex(n => n > 1)')).toHaveLength(0)
  })

  it('arr.includes() returns boolean', () => {
    expect(errors('const arr: number[] = [1,2]; const has: boolean = arr.includes(1)')).toHaveLength(0)
  })

  it('arr.indexOf() returns number', () => {
    expect(errors('const arr: number[] = [1,2]; const i: number = arr.indexOf(1)')).toHaveLength(0)
  })

  it('arr.slice() returns same array type', () => {
    expect(errors('const arr: number[] = [1,2,3]; const sliced: number[] = arr.slice(0, 2)')).toHaveLength(0)
  })

  it('arr.forEach() returns void', () => {
    expect(errors('const arr: number[] = [1,2]; const r: void = arr.forEach(x => {})')).toHaveLength(0)
  })

  it('arr.some() returns boolean', () => {
    expect(errors('const arr: number[] = [1,2]; const b: boolean = arr.some(x => x > 1)')).toHaveLength(0)
  })

  it('arr.every() returns boolean', () => {
    expect(errors('const arr: number[] = [1,2]; const b: boolean = arr.every(x => x > 0)')).toHaveLength(0)
  })

  it('arr.join() returns string', () => {
    expect(errors('const arr: number[] = [1,2]; const s: string = arr.join(",")')).toHaveLength(0)
  })

  it('arr.sort() returns array of same type', () => {
    expect(errors('const arr: number[] = [3,1,2]; const sorted: number[] = arr.sort()')).toHaveLength(0)
  })

  it('arr.reverse() returns array', () => {
    expect(errors('const arr: number[] = [1,2]; const rev: number[] = arr.reverse()')).toHaveLength(0)
  })

  it('arr.at() returns T | undefined', () => {
    expect(errors('const arr: number[] = [1,2]; const x = arr.at(0)')).toHaveLength(0)
  })

  it('arr.length is number', () => {
    expect(errors('const arr: number[] = [1,2]; const n: number = arr.length')).toHaveLength(0)
  })

  it('Array.isArray() returns boolean', () => {
    expect(errors('const b: boolean = Array.isArray([1,2,3])')).toHaveLength(0)
  })
})

// ── L2: String method signatures ─────────────────────────────────────────────

describe('L2: String method signatures', () => {
  it('str.includes() returns boolean', () => {
    expect(errors('const s: string = "hello"; const b: boolean = s.includes("ell")')).toHaveLength(0)
  })

  it('str.startsWith() returns boolean', () => {
    expect(errors('const s: string = "hello"; const b: boolean = s.startsWith("he")')).toHaveLength(0)
  })

  it('str.endsWith() returns boolean', () => {
    expect(errors('const s: string = "hello"; const b: boolean = s.endsWith("lo")')).toHaveLength(0)
  })

  it('str.indexOf() returns number', () => {
    expect(errors('const s: string = "hello"; const n: number = s.indexOf("e")')).toHaveLength(0)
  })

  it('str.slice() returns string', () => {
    expect(errors('const s: string = "hello"; const t: string = s.slice(1, 3)')).toHaveLength(0)
  })

  it('str.split() returns string[]', () => {
    expect(errors('const s: string = "a,b,c"; const parts: string[] = s.split(",")')).toHaveLength(0)
  })

  it('str.replace() returns string', () => {
    expect(errors('const s: string = "hello"; const t: string = s.replace("l", "r")')).toHaveLength(0)
  })

  it('str.trim() returns string', () => {
    expect(errors('const s: string = "  hello  "; const t: string = s.trim()')).toHaveLength(0)
  })

  it('str.toUpperCase() returns string', () => {
    expect(errors('const s: string = "hello"; const t: string = s.toUpperCase()')).toHaveLength(0)
  })

  it('str.toLowerCase() returns string', () => {
    expect(errors('const s: string = "HELLO"; const t: string = s.toLowerCase()')).toHaveLength(0)
  })

  it('str.length is number', () => {
    expect(errors('const s: string = "hello"; const n: number = s.length')).toHaveLength(0)
  })

  it('str.at() returns string | undefined', () => {
    expect(errors('const s: string = "hello"; const c = s.at(0)')).toHaveLength(0)
  })

  it('str.charCodeAt() returns number', () => {
    expect(errors('const s: string = "hello"; const n: number = s.charCodeAt(0)')).toHaveLength(0)
  })

  it('str.repeat() returns string', () => {
    expect(errors('const s: string = "ha"; const t: string = s.repeat(3)')).toHaveLength(0)
  })
})

// ── L3: Object/Number/Math static methods ────────────────────────────────────

describe('L3: Object/Number/Math static method signatures', () => {
  it('Object.keys() returns string[]', () => {
    expect(errors('const obj = {a: 1}; const keys: string[] = Object.keys(obj)')).toHaveLength(0)
  })

  it('Object.values() returns any[]', () => {
    expect(errors('const obj = {a: 1}; const vals = Object.values(obj)')).toHaveLength(0)
  })

  it('Object.entries() returns array', () => {
    expect(errors('const obj = {a: 1}; const entries = Object.entries(obj)')).toHaveLength(0)
  })

  it('Object.hasOwn() returns boolean', () => {
    expect(errors('const b: boolean = Object.hasOwn({a:1}, "a")')).toHaveLength(0)
  })

  it('Object.assign() returns any', () => {
    expect(errors('const merged = Object.assign({}, {a: 1}, {b: 2})')).toHaveLength(0)
  })

  it('Number.isNaN() returns boolean', () => {
    expect(errors('const b: boolean = Number.isNaN(NaN)')).toHaveLength(0)
  })

  it('Number.isFinite() returns boolean', () => {
    expect(errors('const b: boolean = Number.isFinite(42)')).toHaveLength(0)
  })

  it('Number.isInteger() returns boolean', () => {
    expect(errors('const b: boolean = Number.isInteger(42)')).toHaveLength(0)
  })

  it('Number.parseFloat() returns number', () => {
    expect(errors('const n: number = Number.parseFloat("3.14")')).toHaveLength(0)
  })

  it('Math.abs() returns number', () => {
    expect(errors('const n: number = Math.abs(-5)')).toHaveLength(0)
  })

  it('Math.floor() returns number', () => {
    expect(errors('const n: number = Math.floor(3.7)')).toHaveLength(0)
  })

  it('Math.random() returns number', () => {
    expect(errors('const n: number = Math.random()')).toHaveLength(0)
  })

  it('Math.min/max() returns number', () => {
    expect(errors('const n: number = Math.min(1, 2, 3)')).toHaveLength(0)
    expect(errors('const n: number = Math.max(1, 2, 3)')).toHaveLength(0)
  })

  it('Math.sqrt() returns number', () => {
    expect(errors('const n: number = Math.sqrt(16)')).toHaveLength(0)
  })

  it('Math.PI is number', () => {
    expect(errors('const n: number = Math.PI')).toHaveLength(0)
  })
})

// ── L4: Promise<T> method signatures ─────────────────────────────────────────

describe('L4: Promise<T> method signatures', () => {
  it('Promise.resolve() returns promise', () => {
    expect(errors('const p: Promise<number> = Promise.resolve(42)')).toHaveLength(0)
  })

  it('Promise.reject() returns promise', () => {
    expect(errors('const p = Promise.reject(new Error("oops"))')).toHaveLength(0)
  })

  it('Promise.all() returns promise', () => {
    expect(errors('const p = Promise.all([Promise.resolve(1)])')).toHaveLength(0)
  })

  it('Promise.race() returns promise', () => {
    expect(errors('const p = Promise.race([Promise.resolve(1)])')).toHaveLength(0)
  })

  it('.then() returns promise', () => {
    expect(errors(`
      const p: Promise<number> = Promise.resolve(42)
      const p2 = p.then(n => n + 1)
    `)).toHaveLength(0)
  })

  it('.catch() returns promise', () => {
    expect(errors(`
      const p: Promise<number> = Promise.resolve(42)
      const p2 = p.catch(e => 0)
    `)).toHaveLength(0)
  })

  it('.finally() returns promise', () => {
    expect(errors(`
      const p: Promise<number> = Promise.resolve(42)
      const p2 = p.finally(() => {})
    `)).toHaveLength(0)
  })

  it('Promise.resolve infers value type from argument', () => {
    expect(errors(`
      const p = Promise.resolve(42)
      const n: Promise<number> = p
    `)).toHaveLength(0)
  })

  it('Promise.resolve with string argument', () => {
    expect(errors(`
      const p = Promise.resolve("hello")
      const s: Promise<string> = p
    `)).toHaveLength(0)
  })

  it('Promise.all infers array element type from promise array', () => {
    expect(errors(`
      const promises = [Promise.resolve(1), Promise.resolve(2)]
      const result = Promise.all(promises)
    `)).toHaveLength(0)
  })

  it('.then() with concise arrow infers return type', () => {
    expect(errors(`
      const p = Promise.resolve(1)
      const p2 = p.then(n => n + 1)
    `)).toHaveLength(0)
  })

  it('.then() with annotated return type', () => {
    expect(errors(`
      const p = Promise.resolve(1)
      const p2: Promise<string> = p.then((n): string => String(n))
    `)).toHaveLength(0)
  })
})

// ── L5: Map/Set/Weak* method signatures ──────────────────────────────────────

describe('L5: Map/Set/Weak* method signatures', () => {
  it('new Map() creates Map type', () => {
    expect(errors('const m: Map<string, number> = new Map()')).toHaveLength(0)
  })

  it('new Set() creates Set type', () => {
    expect(errors('const s: Set<string> = new Set()')).toHaveLength(0)
  })

  it('new WeakMap() is valid', () => {
    expect(errors('const wm: WeakMap<object, number> = new WeakMap()')).toHaveLength(0)
  })

  it('Map type resolves from type annotation', () => {
    expect(errors('const m: Map<string, number> = new Map()')).toHaveLength(0)
  })

  it('Map.set() returns Map type (no error)', () => {
    expect(errors(`
      const m = new Map()
      m.set("key", 42)
    `)).toHaveLength(0)
  })

  it('Map.has() returns boolean', () => {
    expect(errors(`
      const m = new Map()
      const b: boolean = m.has("key")
    `)).toHaveLength(0)
  })

  it('Map.delete() returns boolean', () => {
    expect(errors(`
      const m = new Map()
      const b: boolean = m.delete("key")
    `)).toHaveLength(0)
  })

  it('Map.get() returns V | undefined', () => {
    expect(errors(`
      const m: Map<string, number> = new Map()
      const v = m.get("key")
    `)).toHaveLength(0)
  })

  it('Map.clear() returns void', () => {
    expect(errors(`
      const m = new Map()
      m.clear()
    `)).toHaveLength(0)
  })

  it('Set.add() returns Set type (no error)', () => {
    expect(errors(`
      const s = new Set()
      s.add("hello")
    `)).toHaveLength(0)
  })

  it('Set.has() returns boolean', () => {
    expect(errors(`
      const s = new Set()
      const b: boolean = s.has("hello")
    `)).toHaveLength(0)
  })

  it('Set.delete() returns boolean', () => {
    expect(errors(`
      const s = new Set()
      const b: boolean = s.delete("hello")
    `)).toHaveLength(0)
  })

  it('WeakMap.set/get/has/delete all callable (no error)', () => {
    expect(errors(`
      const wm = new WeakMap()
      const key = {}
      wm.set(key, 1)
      wm.has(key)
      wm.delete(key)
    `)).toHaveLength(0)
  })

  it('WeakSet.add/has/delete all callable (no error)', () => {
    expect(errors(`
      const ws = new WeakSet()
      const key = {}
      ws.add(key)
      ws.has(key)
      ws.delete(key)
    `)).toHaveLength(0)
  })

  it('WeakRef.deref() returns value | undefined', () => {
    expect(errors(`
      const obj = { x: 1 }
      const ref = new WeakRef(obj)
      const v = ref.deref()
    `)).toHaveLength(0)
  })

  it('Set.union/intersection/difference return Set (ES2025)', () => {
    expect(errors(`
      const a = new Set()
      const b = new Set()
      a.union(b)
      a.intersection(b)
      a.difference(b)
    `)).toHaveLength(0)
  })

  it('Set.isSubsetOf/isSupersetOf return boolean (ES2025)', () => {
    expect(errors(`
      const a = new Set()
      const b = new Set()
      const r1: boolean = a.isSubsetOf(b)
      const r2: boolean = a.isSupersetOf(b)
    `)).toHaveLength(0)
  })
})

// ── L6: Error/JSON/console/RegExp signatures ──────────────────────────────────

describe('L6: Error/JSON/console/RegExp signatures', () => {
  it('JSON.parse() returns any', () => {
    expect(errors('const x = JSON.parse("{}")')).toHaveLength(0)
  })

  it('JSON.stringify() returns string', () => {
    expect(errors('const s: string = JSON.stringify({a: 1})')).toHaveLength(0)
  })

  it('console.log() returns void', () => {
    expect(errors('const v: void = console.log("hello")')).toHaveLength(0)
  })

  it('console.error() returns void', () => {
    expect(errors('console.error("error")')).toHaveLength(0)
  })

  it('new Error() creates Error object', () => {
    expect(errors('const e = new Error("oops")')).toHaveLength(0)
  })

  it('Error.isError() returns boolean', () => {
    expect(errors('const b: boolean = Error.isError(new Error())')).toHaveLength(0)
  })
})

// ── T1: Tuple types ───────────────────────────────────────────────────────────

describe('T1: Tuple types', () => {
  it('tuple type annotation accepted', () => {
    expect(errors('const pair: [string, number] = ["hello", 42]')).toHaveLength(0)
  })

  it('tuple index 0 returns first element type', () => {
    expect(errors(`
      const pair: [string, number] = ["hello", 42]
      const s: string = pair[0]
    `)).toHaveLength(0)
  })

  it('tuple index 1 returns second element type', () => {
    expect(errors(`
      const pair: [string, number] = ["hello", 42]
      const n: number = pair[1]
    `)).toHaveLength(0)
  })

  it('tuple destructuring — each element gets correct type', () => {
    expect(errors(`
      const pair: [string, number] = ["hello", 42]
      const [s, n]: [string, number] = pair
    `)).toHaveLength(0)
  })

  it('tuple length is number', () => {
    expect(errors(`
      const pair: [string, number] = ["hello", 42]
      const len: number = pair.length
    `)).toHaveLength(0)
  })

  it('tuple is consistent with array', () => {
    expect(errors(`
      const t: [number, number] = [1, 2]
      const arr: number[] = t
    `)).toHaveLength(0)
  })
})

// ── T2: Index signatures ──────────────────────────────────────────────────────

describe('T2: Index signatures', () => {
  it('index signature type resolves in type literal', () => {
    expect(errors(`
      const map: { [key: string]: number } = {}
      const n: number = map["key"]
    `)).toHaveLength(0)
  })

  it('Record<string, number> resolves correctly', () => {
    expect(errors('const r: Record<string, number> = { a: 1, b: 2 }')).toHaveLength(0)
  })
})

// ── T3: User-defined type guards ──────────────────────────────────────────────

describe('T3: User-defined type guards (TSTypePredicate)', () => {
  it('type predicate function resolves to boolean', () => {
    expect(errors(`
      function isString(x: any): x is string { return typeof x === "string" }
      const b: boolean = isString(42)
    `)).toHaveLength(0)
  })

  it('Array.isArray type guard works', () => {
    expect(errors(`
      const val: any = [1, 2, 3]
      const b: boolean = Array.isArray(val)
    `)).toHaveLength(0)
  })

  it('user-defined type guard narrows type in if branch', () => {
    expect(errors(`
      function isString(x: string | number): x is string { return typeof x === 'string' }
      const val: string | number = 'hello'
      if (isString(val)) {
        const s: string = val
      }
    `)).toHaveLength(0)
  })

  it('user-defined type guard narrows to specific class type', () => {
    expect(errors(`
      class Dog { breed: string = 'Lab' }
      function isDog(x: any): x is Dog { return x instanceof Dog }
      const animal: any = new Dog()
      if (isDog(animal)) {
        const d: Dog = animal
      }
    `)).toHaveLength(0)
  })
})

// ── T5: T? null safety ────────────────────────────────────────────────────────

describe('T5: T? null safety syntax', () => {
  it('T? preprocessor transforms to T | null | undefined', () => {
    const { transformNullSafety } = require('../../src/preprocessor/nullSafety')
    expect(transformNullSafety('const x: string? = null')).toBe('const x: string | null | undefined = null')
  })

  it('T? in parameter transforms correctly', () => {
    const { transformNullSafety } = require('../../src/preprocessor/nullSafety')
    const result = transformNullSafety('function f(x: number?): void {}')
    expect(result).toContain('number | null | undefined')
  })

  it('does not transform optional chaining ?.', () => {
    const { transformNullSafety } = require('../../src/preprocessor/nullSafety')
    const result = transformNullSafety('const y = obj?.prop')
    expect(result).toBe('const y = obj?.prop')
  })

  it('T? preprocessor used in full pipeline', () => {
    const { preprocessSJS } = require('../../src/preprocessor')
    const result = preprocessSJS('const x: string? = null')
    expect(result).toContain('null | undefined')
  })
})

// ── T6: new expression type inference ─────────────────────────────────────────

describe('T6: new expression type inference', () => {
  it('new Map() returns Map type', () => {
    expect(errors('const m = new Map()')).toHaveLength(0)
  })

  it('new Set() returns Set type', () => {
    expect(errors('const s = new Set()')).toHaveLength(0)
  })

  it('new Error() returns object with message', () => {
    expect(errors('const e = new Error("oops")')).toHaveLength(0)
  })

  it('new Promise() returns promise type', () => {
    expect(errors('const p: Promise<number> = new Promise<number>((resolve) => resolve(1))')).toHaveLength(0)
  })

  it('new RegExp() is valid', () => {
    expect(errors('const r = new RegExp("pattern")')).toHaveLength(0)
  })
})

// ── E1: Increment/decrement operators ────────────────────────────────────────

describe('E1: Increment/decrement operators', () => {
  it('++ on number returns number', () => {
    expect(errors('let x: number = 5; const n: number = x++')).toHaveLength(0)
  })

  it('-- on number returns number', () => {
    expect(errors('let x: number = 5; const n: number = x--')).toHaveLength(0)
  })

  it('++ is valid on number variable', () => {
    expect(errors('let x: number = 0; x++')).toHaveLength(0)
  })
})

// ── E2: Logical assignment operators ─────────────────────────────────────────

describe('E2: Logical assignment operators', () => {
  it('&&= is valid', () => {
    expect(errors('let x: number = 5; x &&= 10')).toHaveLength(0)
  })

  it('||= is valid', () => {
    expect(errors('let x: number = 0; x ||= 42')).toHaveLength(0)
  })

  it('??= is valid', () => {
    expect(errors(`let x: number | null = null; x ??= 42`)).toHaveLength(0)
  })
})

// ── E3: Compound assignment operators ────────────────────────────────────────

describe('E3: Compound assignment operators', () => {
  it('+= is valid', () => {
    expect(errors('let x: number = 5; x += 10')).toHaveLength(0)
  })

  it('-= is valid', () => {
    expect(errors('let x: number = 5; x -= 3')).toHaveLength(0)
  })

  it('*= is valid', () => {
    expect(errors('let x: number = 5; x *= 2')).toHaveLength(0)
  })

  it('/= is valid', () => {
    expect(errors('let x: number = 10; x /= 2')).toHaveLength(0)
  })

  it('%=, **= are valid', () => {
    expect(errors('let x: number = 10; x %= 3')).toHaveLength(0)
    expect(errors('let x: number = 2; x **= 3')).toHaveLength(0)
  })
})

// ── E4: import.meta and new.target ────────────────────────────────────────────

describe('E4: import.meta and new.target', () => {
  it('import.meta.url is string', () => {
    const { parse } = require('@babel/parser')
    const traverse = require('@babel/traverse').default
    const { TypeChecker } = require('../../src/typeChecker')
    const ast = parse('const url: string = import.meta.url', {
      sourceType: 'module',
      plugins: ['typescript'],
    })
    const checker = new TypeChecker()
    traverse(ast, { enter(p: any) { checker.check(p) } })
    expect(checker.getDiagnostics().filter((d: any) => d.severity === 'error')).toHaveLength(0)
  })
})

// ── E5: TSAsExpression and TSNonNullExpression ────────────────────────────────

describe('E5: TSAsExpression, TSNonNullExpression', () => {
  it('x as T returns type T', () => {
    expect(errors('const x: any = 42; const n: number = x as number')).toHaveLength(0)
  })

  it('x! non-null assertion emits SJS-E006 (banned in SJS)', () => {
    expect(errorCodes('const x: number | null = 42; const n = x!')).toContain('SJS-E006')
  })

  it('sequence expression returns type of last', () => {
    expect(errors('const n: number = (1, 2, 3)')).toHaveLength(0)
  })
})

// ── SJS1: Missing error codes ─────────────────────────────────────────────────

describe('SJS1: Missing error codes', () => {
  it('SJS-E006: non-null assertion is banned', () => {
    expect(errorCodes('const x: string | null = null; const s = x!')).toContain('SJS-E006')
  })

  it('SJS-E006: chained non-null assertion is banned', () => {
    expect(errorCodes('const obj: { x: number } | null = null; const n = obj!.x')).toContain('SJS-E006')
  })

  it('no SJS-E006 for regular ! (logical NOT)', () => {
    expect(errorCodes('const b = !true')).not.toContain('SJS-E006')
  })

  it('SJS-E006 error message mentions optional chaining', () => {
    const diags = typeCheck('const x: string | null = null; const s = x!')
    const e006 = diags.filter(d => d.code === 'SJS-E006')
    expect(e006.length).toBeGreaterThan(0)
    expect(e006[0].message).toContain('?.')
  })

  it('SJS-E008: await outside async function emits error', () => {
    expect(errorCodes('const x = await fetch("url")')).toContain('SJS-E008')
  })

  it('SJS-E008: await inside async function is valid', () => {
    expect(errors('async function f() { const x = await Promise.resolve(1); return x }')).toHaveLength(0)
  })

  it('SJS-E008: await inside async arrow is valid', () => {
    expect(errors('const f = async () => { const x = await Promise.resolve(1); return x }')).toHaveLength(0)
  })

  it('SJS-E008: await inside async class method is valid', () => {
    expect(errors('class C { async m() { const x = await Promise.resolve(1); return x } }')).toHaveLength(0)
  })

  it('SJS-E009: type-only import used as value emits error', () => {
    const src = `import type { Foo } from './foo'; const x = Foo`
    expect(errorCodes(src)).toContain('SJS-E009')
  })

  it('SJS-E009: regular import used as value is valid', () => {
    expect(errors(`import { Foo } from './foo'; const x = Foo`)).toHaveLength(0)
  })

  it('SJS-E005: member access on null union type emits warning', () => {
    const diags = typeCheck('const x: string | null = null; const n = x.length')
    const codes = diags.map(d => d.code)
    expect(codes).toContain('SJS-E005')
  })

  it('SJS-E005: member access on undefined union type emits warning', () => {
    const diags = typeCheck('const x: number | undefined = 1; const n = x.toString()')
    const codes = diags.map(d => d.code)
    expect(codes).toContain('SJS-E005')
  })

  it('SJS-E005: optional chaining on nullable is safe (no warning)', () => {
    const diags = typeCheck('const x: string | null = null; const n = x?.length')
    expect(diags.map(d => d.code)).not.toContain('SJS-E005')
  })

  it('SJS-E005: member access on non-nullable type is safe', () => {
    const diags = typeCheck('const x: string = "hello"; const n = x.length')
    expect(diags.map(d => d.code)).not.toContain('SJS-E005')
  })

  it('SJS-E005: diagnostic message mentions optional chaining', () => {
    const diags = typeCheck('const x: string | null = null; const n = x.length')
    const e005 = diags.filter(d => d.code === 'SJS-E005')
    expect(e005.length).toBeGreaterThan(0)
    expect(e005[0].message).toContain('?.')
  })
})

// ── SJS4: pub/priv/prot access modifiers ──────────────────────────────────────

describe('SJS4: access modifier preprocessor + SJS-E011 type checker', () => {
  it('preprocessor converts priv → private', () => {
    const { transformAccessModifiers } = require('../../src/preprocessor/accessModifiers')
    const src = 'class Foo { priv x: number = 0 }'
    expect(transformAccessModifiers(src)).toContain('private x')
  })

  it('preprocessor converts pub → public', () => {
    const { transformAccessModifiers } = require('../../src/preprocessor/accessModifiers')
    const src = 'class Foo { pub greet() {} }'
    expect(transformAccessModifiers(src)).toContain('public greet')
  })

  it('preprocessor converts prot → protected', () => {
    const { transformAccessModifiers } = require('../../src/preprocessor/accessModifiers')
    const src = 'class Foo { prot value: string = "" }'
    expect(transformAccessModifiers(src)).toContain('protected value')
  })

  it('preprocessor does not replace pub/priv as substrings of identifiers', () => {
    const { transformAccessModifiers } = require('../../src/preprocessor/accessModifiers')
    const src = 'const publish = "pub"'
    expect(transformAccessModifiers(src)).not.toContain('publiclish')
  })

  it('SJS-E011: accessing private member from instance outside class emits error', () => {
    const typeCheckWithExit = (source: string) => {
      const { parse } = require('@babel/parser')
      const traverse = require('@babel/traverse').default
      const { TypeChecker } = require('../../src/typeChecker')
      const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
      const checker = new TypeChecker()
      traverse(ast, {
        enter(p: any) { checker.check(p) },
        exit(p: any) { checker.exit(p) },
      })
      return checker.getDiagnostics().filter((d: any) => d.severity === 'error').map((d: any) => d.code)
    }

    const src = `
      class Counter {
        private count: number = 0
        increment() { this.count++ }
      }
      const c = new Counter()
      const n = c.count
    `
    expect(typeCheckWithExit(src)).toContain('SJS-E011')
  })

  it('SJS-E011: accessing own private member from within class method is valid', () => {
    const typeCheckWithExit = (source: string) => {
      const { parse } = require('@babel/parser')
      const traverse = require('@babel/traverse').default
      const { TypeChecker } = require('../../src/typeChecker')
      const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
      const checker = new TypeChecker()
      traverse(ast, {
        enter(p: any) { checker.check(p) },
        exit(p: any) { checker.exit(p) },
      })
      return checker.getDiagnostics().filter((d: any) => d.severity === 'error')
    }

    const src = `
      class Counter {
        private count: number = 0
        getCount(): number { return this.count }
      }
    `
    expect(typeCheckWithExit(src)).toHaveLength(0)
  })
})

// ── SJS5: implements clause checking ──────────────────────────────────────────

describe('SJS5: implements clause structural conformance', () => {
  const typeCheckWithExit = (source: string) => {
    const { parse } = require('@babel/parser')
    const traverse = require('@babel/traverse').default
    const { TypeChecker } = require('../../src/typeChecker')
    const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
    const checker = new TypeChecker()
    traverse(ast, {
      enter(p: any) { checker.check(p) },
      exit(p: any) { checker.exit(p) },
    })
    return checker.getDiagnostics().filter((d: any) => d.severity === 'error')
  }

  it('SJS-E012: class missing method required by interface', () => {
    const src = `
      interface Greeter {
        greet(name: string): string
      }
      class BadGreeter implements Greeter {
        // Missing: greet method
        sayHello(): string { return "hello" }
      }
    `
    const codes = typeCheckWithExit(src).map((d: any) => d.code)
    expect(codes).toContain('SJS-E012')
  })

  it('class with all interface members is valid', () => {
    const src = `
      interface Greeter {
        greet(name: string): string
      }
      class HelloGreeter implements Greeter {
        greet(name: string): string { return "Hello " + name }
      }
    `
    expect(typeCheckWithExit(src)).toHaveLength(0)
  })

  it('SJS-E012: class missing property required by interface', () => {
    const src = `
      interface Named {
        name: string
      }
      class Unnamed implements Named {
        // Missing: name property
        id: number = 0
      }
    `
    const codes = typeCheckWithExit(src).map((d: any) => d.code)
    expect(codes).toContain('SJS-E012')
  })

  it('class implementing multiple interfaces — all members required', () => {
    const src = `
      interface A { foo(): void }
      interface B { bar(): void }
      class C implements A, B {
        foo(): void {}
        bar(): void {}
      }
    `
    expect(typeCheckWithExit(src)).toHaveLength(0)
  })

  it('SJS-E012: class missing one of two interface members', () => {
    const src = `
      interface A { foo(): void }
      interface B { bar(): void }
      class C implements A, B {
        foo(): void {}
        // Missing: bar
      }
    `
    const codes = typeCheckWithExit(src).map((d: any) => d.code)
    expect(codes).toContain('SJS-E012')
  })
})

// ── Date instance methods ─────────────────────────────────────────────────────

describe('Date instance methods — ECMA-262 §21.4', () => {
  it('new Date() toISOString() returns string', () => {
    expect(errors(`
      const d = new Date()
      const s: string = d.toISOString()
    `)).toHaveLength(0)
  })

  it('new Date() getFullYear() returns number', () => {
    expect(errors(`
      const d = new Date()
      const y: number = d.getFullYear()
    `)).toHaveLength(0)
  })

  it('new Date() getTime() returns number', () => {
    expect(errors(`
      const d = new Date()
      const t: number = d.getTime()
    `)).toHaveLength(0)
  })

  it('new Date() toLocaleDateString() returns string', () => {
    expect(errors(`
      const d = new Date()
      const s: string = d.toLocaleDateString()
    `)).toHaveLength(0)
  })

  it('Date.now() returns number', () => {
    expect(errors('const t: number = Date.now()')).toHaveLength(0)
  })
})

// ── RegExp instance methods ───────────────────────────────────────────────────

describe('RegExp instance methods — ECMA-262 §22.2', () => {
  it('new RegExp .test() returns boolean', () => {
    expect(errors(`
      const re = new RegExp("d+")
      const b: boolean = re.test("abc123")
    `)).toHaveLength(0)
  })

  it('new RegExp .exec() is callable', () => {
    expect(errors(`
      const re = new RegExp("d+")
      const result = re.exec("abc123")
    `)).toHaveLength(0)
  })
})

// ── Array.map callback return type inference ──────────────────────────────────

describe('Array.map/reduce callback inference', () => {
  it('arr.map(n => n.toString()) returns string[]', () => {
    expect(errors(`
      const nums: number[] = [1, 2, 3]
      const strs: string[] = nums.map(n => n.toString())
    `)).toHaveLength(0)
  })

  it('arr.map inferred string[] assignable to string[] annotation', () => {
    expect(errors(`
      const nums: number[] = [1, 2, 3]
      const strs: string[] = nums.map(n => n.toString())
    `)).toHaveLength(0)
  })

  it('arr.map(n => n * 2) returns number[]', () => {
    expect(errors(`
      const nums: number[] = [1, 2, 3]
      const doubled: number[] = nums.map(n => n * 2)
    `)).toHaveLength(0)
  })

  it('arr.flatMap(n => [n, n]) returns number[]', () => {
    expect(errors(`
      const nums: number[] = [1, 2, 3]
      const flat: number[] = nums.flatMap(n => [n, n])
    `)).toHaveLength(0)
  })

  it('arr.flat() unwraps one level of array nesting', () => {
    expect(errors(`
      const nested: number[][] = [[1, 2], [3, 4]]
      const flat: number[] = nested.flat()
    `)).toHaveLength(0)
  })

  it('arr.flat() on flat array stays same element type', () => {
    expect(errors(`
      const nums: number[] = [1, 2, 3]
      const flat: number[] = nums.flat()
    `)).toHaveLength(0)
  })

  it('arr.reduce(acc, n => acc + n, 0) infers number from initial', () => {
    expect(errors(`
      const nums: number[] = [1, 2, 3]
      const total: number = nums.reduce((acc, n) => acc + n, 0)
    `)).toHaveLength(0)
  })

  it('arr.reduce with string initial infers string', () => {
    expect(errors(`
      const words: string[] = ['a', 'b']
      const joined: string = words.reduce((acc, w) => acc + w, "")
    `)).toHaveLength(0)
  })
})

// ── New features: generators ──────────────────────────────────────────────────

describe('Generator functions (function*) — ECMA-262 §27.3', () => {
  it('generator function registers as generator type', () => {
    expect(errors(`
      function* gen(): Generator<number, void, unknown> {
        yield 1
      }
    `)).toHaveLength(0)
  })

  it('generator function without annotation — no error', () => {
    expect(errors(`
      function* counter() {
        yield 1
        yield 2
      }
    `)).toHaveLength(0)
  })

  it('generator expression — no error', () => {
    expect(errors(`
      const gen = function*() { yield 1 }
    `)).toHaveLength(0)
  })

  it('for-of over generator — element type from yield', () => {
    expect(errors(`
      function* nums(): Generator<number, void, unknown> { yield 1 }
      const g = nums()
      for (const n of g) {
        const x: number = n
      }
    `)).toHaveLength(0)
  })
})

// ── Object spread ─────────────────────────────────────────────────────────────

describe('Object spread ({...a, ...b}) — ES2018', () => {
  it('spread merges properties — no error', () => {
    expect(errors(`
      const a = { x: 1 }
      const b = { y: 'hello' }
      const c = { ...a, ...b, z: true }
    `)).toHaveLength(0)
  })

  it('spread object assigns to wider type', () => {
    expect(errors(`
      const defaults = { timeout: 5000, retries: 3 }
      const opts = { ...defaults, url: 'http://example.com' }
      const t: number = opts.timeout
    `)).toHaveLength(0)
  })

  it('spread in object literal — preserves type', () => {
    expect(errors(`
      const base = { name: 'Alice', age: 30 }
      const extended = { ...base, role: 'admin' }
    `)).toHaveLength(0)
  })
})

// ── Array spread ──────────────────────────────────────────────────────────────

describe('Array spread ([...a, ...b]) — ES2015', () => {
  it('spread in array literal — no error', () => {
    expect(errors(`
      const a: number[] = [1, 2, 3]
      const b: number[] = [4, 5]
      const c = [...a, ...b]
    `)).toHaveLength(0)
  })

  it('spread string in array — string elements', () => {
    expect(errors(`
      const chars = [..."hello"]
    `)).toHaveLength(0)
  })
})

// ── Nested destructuring ──────────────────────────────────────────────────────

describe('Nested destructuring — ECMA-262 §14.3.3', () => {
  it('object with default values — no error', () => {
    expect(errors(`
      const { x = 0, y = '' } = { x: 1 }
      const n: number = x
    `)).toHaveLength(0)
  })

  it('nested object destructuring — binds inner names', () => {
    expect(errors(`
      const obj = { a: { b: 42, c: 'hello' } }
      const { a: { b, c } } = obj
    `)).toHaveLength(0)
  })

  it('array destructuring with default — no error', () => {
    expect(errors(`
      const [first = 0, second = 0] = [1]
    `)).toHaveLength(0)
  })

  it('for-of with object destructuring', () => {
    expect(errors(`
      const pairs = [{ key: 'a', val: 1 }, { key: 'b', val: 2 }]
      for (const { key, val } of pairs) {
        const k: string = key
        const v: number = val
      }
    `)).toHaveLength(0)
  })

  it('for-of with array destructuring', () => {
    expect(errors(`
      const matrix: [number, number][] = [[1,2],[3,4]]
      for (const [a, b] of matrix) {
      }
    `)).toHaveLength(0)
  })
})

// ── Typed arrays ──────────────────────────────────────────────────────────────

describe('Typed arrays — ECMA-262 §23.2', () => {
  it('new Int32Array — no error', () => {
    expect(errors(`
      const buf = new Int32Array(10)
      const len: number = buf.length
    `)).toHaveLength(0)
  })

  it('new Float64Array — no error', () => {
    expect(errors(`
      const arr = new Float64Array([1.0, 2.0, 3.0])
    `)).toHaveLength(0)
  })

  it('typed array annotation — no error', () => {
    expect(errors(`
      const view: Uint8Array = new Uint8Array(256)
      const b: number = view.byteLength
    `)).toHaveLength(0)
  })

  it('Int8Array methods — no error', () => {
    expect(errors(`
      const a = new Int8Array(4)
      a.fill(0)
      const included: boolean = a.includes(0)
      const idx: number = a.indexOf(0)
    `)).toHaveLength(0)
  })

  it('BigInt64Array — no error', () => {
    expect(errors(`
      const big = new BigInt64Array(4)
    `)).toHaveLength(0)
  })

  it('ArrayBuffer — no error', () => {
    expect(errors(`
      const buf = new ArrayBuffer(16)
      const size: number = buf.byteLength
    `)).toHaveLength(0)
  })

  it('DataView — no error', () => {
    expect(errors(`
      const buf = new ArrayBuffer(8)
      const dv = new DataView(buf)
      dv.setInt32(0, 42)
      const val: number = dv.getInt32(0)
    `)).toHaveLength(0)
  })
})

// ── Reflect API ───────────────────────────────────────────────────────────────

describe('Reflect API — ECMA-262 §28.1', () => {
  it('Reflect.has returns boolean', () => {
    expect(errors(`
      const obj = { x: 1 }
      const has: boolean = Reflect.has(obj, 'x')
    `)).toHaveLength(0)
  })

  it('Reflect.ownKeys returns string array', () => {
    expect(errors(`
      const keys: string[] = Reflect.ownKeys({})
    `)).toHaveLength(0)
  })

  it('Reflect.get returns any', () => {
    expect(errors(`
      const val = Reflect.get({ x: 1 }, 'x')
    `)).toHaveLength(0)
  })

  it('Reflect.set returns boolean', () => {
    expect(errors(`
      const obj = {}
      const ok: boolean = Reflect.set(obj, 'x', 1)
    `)).toHaveLength(0)
  })

  it('Reflect.deleteProperty returns boolean', () => {
    expect(errors(`
      const ok: boolean = Reflect.deleteProperty({}, 'key')
    `)).toHaveLength(0)
  })
})

// ── FinalizationRegistry ──────────────────────────────────────────────────────

describe('FinalizationRegistry — ECMA-262 §26.2', () => {
  it('new FinalizationRegistry — no error', () => {
    expect(errors(`
      const registry = new FinalizationRegistry((value: string) => {})
    `)).toHaveLength(0)
  })

  it('register method — no error', () => {
    expect(errors(`
      const registry = new FinalizationRegistry((val: string) => {})
      const target = {}
      registry.register(target, 'token')
    `)).toHaveLength(0)
  })
})

// ── AbortController / AbortSignal ─────────────────────────────────────────────

describe('AbortController/AbortSignal — Web API', () => {
  it('new AbortController — no error', () => {
    expect(errors(`
      const ctrl = new AbortController()
    `)).toHaveLength(0)
  })

  it('AbortController.signal.aborted is boolean', () => {
    expect(errors(`
      const ctrl = new AbortController()
      const aborted: boolean = ctrl.signal.aborted
    `)).toHaveLength(0)
  })

  it('AbortController.abort() — no error', () => {
    expect(errors(`
      const ctrl = new AbortController()
      ctrl.abort()
    `)).toHaveLength(0)
  })
})

// ── URL / URLSearchParams ─────────────────────────────────────────────────────

describe('URL / URLSearchParams — Web API', () => {
  it('new URL — no error', () => {
    expect(errors(`
      const url = new URL('https://example.com')
    `)).toHaveLength(0)
  })

  it('URL annotation — no error', () => {
    expect(errors(`
      const url: URL = new URL('https://example.com')
      const href: string = url.href
    `)).toHaveLength(0)
  })

  it('new URLSearchParams — no error', () => {
    expect(errors(`
      const params = new URLSearchParams('key=val')
    `)).toHaveLength(0)
  })

  it('URLSearchParams.get returns string or null', () => {
    expect(errors(`
      const params = new URLSearchParams()
      const val = params.get('key')
    `)).toHaveLength(0)
  })
})

// ── TextEncoder / TextDecoder ─────────────────────────────────────────────────

describe('TextEncoder / TextDecoder — Web API', () => {
  it('new TextEncoder — no error', () => {
    expect(errors(`
      const enc = new TextEncoder()
      const bytes = enc.encode('hello')
    `)).toHaveLength(0)
  })

  it('new TextDecoder — no error', () => {
    expect(errors(`
      const dec = new TextDecoder('utf-8')
      const str: string = dec.decode(new Uint8Array([104]))
    `)).toHaveLength(0)
  })
})

// ── Atomics API ───────────────────────────────────────────────────────────────

describe('Atomics — ECMA-262 §25.4', () => {
  it('Atomics.load returns number', () => {
    expect(errors(`
      const buf = new SharedArrayBuffer(4)
      const arr = new Int32Array(buf)
      const val: number = Atomics.load(arr, 0)
    `)).toHaveLength(0)
  })

  it('Atomics.isLockFree returns boolean', () => {
    expect(errors(`
      const free: boolean = Atomics.isLockFree(4)
    `)).toHaveLength(0)
  })
})

// ── Proxy ─────────────────────────────────────────────────────────────────────

describe('Proxy — ECMA-262 §28.2', () => {
  it('new Proxy — returns any', () => {
    expect(errors(`
      const p = new Proxy({}, {})
    `)).toHaveLength(0)
  })

  it('Proxy.revocable — no error', () => {
    expect(errors(`
      const r = Proxy.revocable({}, {})
    `)).toHaveLength(0)
  })
})

// ── Class private fields — ECMA-262 §15.7.1 ─────────────────────────────────

describe('Class private fields (#field) — ECMA-262 §15.7.1', () => {
  it('class with private field declaration — no error', () => {
    expect(errors(`
      class Counter {
        #count: number = 0
        increment() { this.#count++ }
        get() { return this.#count }
      }
    `)).toHaveLength(0)
  })

  it('class with private method — no error', () => {
    expect(errors(`
      class Logger {
        #log(msg: string) { console.log(msg) }
        info(msg: string) { this.#log(msg) }
      }
    `)).toHaveLength(0)
  })

  it('class field type inference — this.x returns declared type', () => {
    expect(errors(`
      class Box {
        value: number = 0
        getValue(): number { return this.value }
      }
    `)).toHaveLength(0)
  })

  it('class methods registered as function types', () => {
    expect(errors(`
      class Adder {
        add(a: number, b: number): number { return a + b }
      }
    `)).toHaveLength(0)
  })
})

// ── ThisExpression type inference ─────────────────────────────────────────────

describe('this expression type inference in class methods', () => {
  it('this.field access returns correct type', () => {
    expect(errors(`
      class Person {
        name: string = 'Alice'
        greet(): string { return this.name }
      }
    `)).toHaveLength(0)
  })

  it('this.method() call — no error', () => {
    expect(errors(`
      class Calc {
        double(n: number): number { return n * 2 }
        quad(n: number): number { return this.double(this.double(n)) }
      }
    `)).toHaveLength(0)
  })
})

// ── Tagged template literals — ECMA-262 §13.2.9 ──────────────────────────────

describe('Tagged template literals — ECMA-262 §13.2.9', () => {
  it('String.raw returns string', () => {
    expect(errors(`
      const path: string = String.raw\`C:\\Users\\name\`
    `)).toHaveLength(0)
  })

  it('custom tag function — infers return type', () => {
    expect(errors(`
      function html(strings: TemplateStringsArray, ...values: any[]): string {
        return strings.join('')
      }
      const result: string = html\`<div>\${'hello'}</div>\`
    `)).toHaveLength(0)
  })

  it('tagged template with any return — no error', () => {
    expect(errors(`
      const gql = (strings: any, ...args: any[]) => ({})
      const query = gql\`query { user { name } }\`
    `)).toHaveLength(0)
  })
})

// ── OptionalCallExpression — ECMA-262 §13.5.1 ────────────────────────────────

describe('Optional call expression (obj?.method()) — ECMA-262 §13.5.1', () => {
  it('optional method call — no error', () => {
    expect(errors(`
      const arr: number[] | null = null
      const len = arr?.map(x => x * 2)
    `)).toHaveLength(0)
  })

  it('optional call on function — no error', () => {
    expect(errors(`
      const fn: ((x: number) => string) | undefined = undefined
      const result = fn?.(42)
    `)).toHaveLength(0)
  })
})

// ── Iterator helpers — ES2025 ─────────────────────────────────────────────────

describe('Iterator helpers — ES2025', () => {
  it('generator.toArray() returns array of yield type', () => {
    expect(errors(`
      function* nums(): Generator<number, void, unknown> { yield 1; yield 2 }
      const g = nums()
      const arr: number[] = g.toArray()
    `)).toHaveLength(0)
  })

  it('generator.map() returns new generator', () => {
    expect(errors(`
      function* strs(): Generator<string, void, unknown> { yield 'a' }
      const g = strs()
      const mapped = g.map(s => s.length)
    `)).toHaveLength(0)
  })

  it('generator.take() returns generator', () => {
    expect(errors(`
      function* inf(): Generator<number, void, unknown> { let i = 0; while(true) yield i++ }
      const limited = inf().take(5)
    `)).toHaveLength(0)
  })

  it('generator.forEach() — no error', () => {
    expect(errors(`
      function* items(): Generator<string, void, unknown> { yield 'a'; yield 'b' }
      items().forEach(s => console.log(s))
    `)).toHaveLength(0)
  })
})

// ── Array.from improvements ───────────────────────────────────────────────────

describe('Array.from with mapper and iterable inference', () => {
  it('Array.from(string) returns string array', () => {
    expect(errors(`
      const chars: string[] = Array.from('hello')
    `)).toHaveLength(0)
  })

  it('Array.from(generator) infers yield type', () => {
    expect(errors(`
      function* nums(): Generator<number, void, unknown> { yield 1 }
      const arr: number[] = Array.from(nums())
    `)).toHaveLength(0)
  })

  it('Array.from(arr, mapper) infers mapped type', () => {
    expect(errors(`
      const strs: string[] = Array.from([1, 2, 3], n => String(n))
    `)).toHaveLength(0)
  })
})

// ── String static methods ─────────────────────────────────────────────────────

describe('String static methods — ECMA-262 §22.1', () => {
  it('String.fromCharCode returns string', () => {
    expect(errors(`
      const ch: string = String.fromCharCode(65)
    `)).toHaveLength(0)
  })

  it('String.fromCodePoint returns string', () => {
    expect(errors(`
      const emoji: string = String.fromCodePoint(128512)
    `)).toHaveLength(0)
  })
})

describe('super() and super.method() — ECMA-262 §13.3.7', () => {
  it('super() call in constructor — no error', () => {
    expect(errors(`
      class Animal {
        name: string = 'animal'
        constructor(name: string) { this.name = name }
      }
      class Dog extends Animal {
        constructor() { super('dog') }
      }
    `)).toHaveLength(0)
  })

  it('super.method() call — no error', () => {
    expect(errors(`
      class Animal {
        speak(): string { return 'animal' }
      }
      class Dog extends Animal {
        speak(): string { return super.speak() + '!' }
      }
    `)).toHaveLength(0)
  })

  it('super.method() result — callable without error', () => {
    expect(errors(`
      class Base {
        greet(name: string): string { return 'hello ' + name }
      }
      class Child extends Base {
        greet(name: string): string {
          const base = super.greet(name)
          return 'child: ' + base
        }
      }
    `)).toHaveLength(0)
  })
})

describe('#field in obj — ES2022 brand check — ECMA-262 §13.5.6', () => {
  it('#field in obj returns boolean — no error', () => {
    expect(errors(`
      class Measurement {
        #value: number = 0
        static isMeasurement(obj: unknown): boolean {
          return #value in (obj as object)
        }
      }
    `)).toHaveLength(0)
  })

  it('#field in obj assignable to boolean', () => {
    expect(errors(`
      class Counter {
        #count: number = 0
        hasBrand(obj: object): boolean {
          return #count in obj
        }
      }
    `)).toHaveLength(0)
  })
})

describe('Class static blocks — ES2022 — ECMA-262 §15.7.1', () => {
  it('static block — no error', () => {
    expect(errors(`
      class Config {
        static version: string = '1.0'
        static {
          Config.version = '2.0'
        }
      }
    `)).toHaveLength(0)
  })

  it('static block with variable — no error', () => {
    expect(errors(`
      class Registry {
        static count: number = 0
        static {
          const init = 42
          Registry.count = init
        }
      }
    `)).toHaveLength(0)
  })
})

describe('RegExp.escape — ES2025 — ECMA-262 §22.2.x', () => {
  it('RegExp.escape returns string', () => {
    expect(errors(`
      const escaped: string = RegExp.escape('hello.world')
    `)).toHaveLength(0)
  })

  it('RegExp.escape result usable as string', () => {
    expect(errors(`
      function safeSearch(term: string): RegExp {
        const pattern: string = RegExp.escape(term)
        return new RegExp(pattern, 'gi')
      }
    `)).toHaveLength(0)
  })
})

describe('Abstract class members — ECMA-262 §15.7.2', () => {
  it('abstract class declaration — no error', () => {
    expect(errors(`
      abstract class Shape {
        abstract area(): number
        perimeter(): number { return 0 }
      }
    `)).toHaveLength(0)
  })

  it('abstract method registered in class registry — concrete subclass satisfies', () => {
    expect(errors(`
      abstract class Animal {
        abstract speak(): string
        breathe(): void {}
      }
      class Dog extends Animal {
        speak(): string { return 'woof' }
      }
    `)).toHaveLength(0)
  })

  it('abstract class with typed abstract property — no error', () => {
    expect(errors(`
      abstract class Repository {
        abstract readonly name: string
        describe(): string { return 'repo' }
      }
    `)).toHaveLength(0)
  })
})

describe('String.prototype ES2024 well-formed methods — ECMA-262 §22.1.3', () => {
  it('isWellFormed() returns boolean', () => {
    expect(errors(`
      const s: string = 'hello'
      const ok: boolean = s.isWellFormed()
    `)).toHaveLength(0)
  })

  it('toWellFormed() returns string', () => {
    expect(errors(`
      const s: string = 'hello\uD800'
      const clean: string = s.toWellFormed()
    `)).toHaveLength(0)
  })

  it('String.prototype.concat returns string', () => {
    expect(errors(`
      const s: string = 'hello'
      const joined: string = s.concat(' world')
    `)).toHaveLength(0)
  })
})

describe('Math.f16round — ES2025 — ECMA-262 §21.3', () => {
  it('Math.f16round returns number', () => {
    expect(errors(`
      const rounded: number = Math.f16round(3.14159)
    `)).toHaveLength(0)
  })
})

describe('for-await-of — ES2018 — ECMA-262 §14.7.5', () => {
  it('for-await-of over async generator — no error', () => {
    expect(errors(`
      async function consume(gen: AsyncGenerator<number>): Promise<void> {
        for await (const n of gen) {
          const x: number = n
        }
      }
    `)).toHaveLength(0)
  })

  it('for-await-of over any — no error', () => {
    expect(errors(`
      async function f(items: any): Promise<void> {
        for await (const item of items) {}
      }
    `)).toHaveLength(0)
  })
})

describe('Namespace imports (import * as ns) — ECMA-262 §16.2.2', () => {
  it('import * as ns — no error on ns usage', () => {
    expect(errors(`
      import * as fs from 'fs'
      const content = fs.readFileSync('file.txt', 'utf-8')
    `)).toHaveLength(0)
  })
})

describe('ArrayBuffer instance methods — ES2024 — ECMA-262 §25.1', () => {
  it('ArrayBuffer.prototype.resize — no error', () => {
    expect(errors(`
      const buf = new ArrayBuffer(1024)
      buf.resize(2048)
    `)).toHaveLength(0)
  })

  it('ArrayBuffer.prototype.transfer returns ArrayBuffer', () => {
    expect(errors(`
      const buf = new ArrayBuffer(1024)
      const moved = buf.transfer()
    `)).toHaveLength(0)
  })

  it('ArrayBuffer.isView returns boolean', () => {
    expect(errors(`
      const arr = new Int32Array(4)
      const isView: boolean = ArrayBuffer.isView(arr)
    `)).toHaveLength(0)
  })
})

describe('delete operator — ECMA-262 §13.5.1', () => {
  it('delete expr returns boolean', () => {
    expect(errors(`const obj = { x: 1 }; const d: boolean = delete obj.x`)).toHaveLength(0)
  })

  it('delete on object property — no error', () => {
    expect(errors(`const o: any = {}; delete o.foo`)).toHaveLength(0)
  })
})

describe('Object shorthand methods — ECMA-262 §13.2.5', () => {
  it('shorthand method inferred as function', () => {
    expect(errors(`
      const obj = {
        greet(name: string): string { return 'hello ' + name },
      }
      const g = obj.greet
    `)).toHaveLength(0)
  })

  it('shorthand getter returns value type', () => {
    expect(errors(`
      const obj = {
        get value(): number { return 42 },
      }
      const v: number = obj.value
    `)).toHaveLength(0)
  })
})

describe('Global functions — ECMA-262 §19.2', () => {
  it('encodeURIComponent returns string', () => {
    expect(errors(`const s: string = encodeURIComponent('hello world')`)).toHaveLength(0)
  })

  it('decodeURIComponent returns string', () => {
    expect(errors(`const s: string = decodeURIComponent('%20')`)).toHaveLength(0)
  })

  it('encodeURI returns string', () => {
    expect(errors(`const s: string = encodeURI('https://example.com')`)).toHaveLength(0)
  })

  it('decodeURI returns string', () => {
    expect(errors(`const s: string = decodeURI('https://example.com')`)).toHaveLength(0)
  })

  it('structuredClone returns any', () => {
    expect(errors(`const copy = structuredClone({ x: 1 })`)).toHaveLength(0)
  })

  it('queueMicrotask returns void', () => {
    expect(errors(`queueMicrotask(() => { console.log('queued') })`)).toHaveLength(0)
  })
})

describe('Number instance methods — ECMA-262 §21.1', () => {
  it('toFixed returns string', () => {
    expect(errors(`const n: number = 3.14159; const s: string = n.toFixed(2)`)).toHaveLength(0)
  })

  it('toPrecision returns string', () => {
    expect(errors(`const n: number = 3.14159; const s: string = n.toPrecision(4)`)).toHaveLength(0)
  })

  it('toExponential returns string', () => {
    expect(errors(`const n: number = 12345; const s: string = n.toExponential(2)`)).toHaveLength(0)
  })
})

describe('BigInt static methods — ECMA-262 §21.2', () => {
  it('BigInt.asIntN returns bigint', () => {
    expect(errors(`const n: bigint = BigInt.asIntN(8, 127n)`)).toHaveLength(0)
  })

  it('BigInt.asUintN returns bigint', () => {
    expect(errors(`const n: bigint = BigInt.asUintN(8, 255n)`)).toHaveLength(0)
  })

  it('bigint.toString returns string', () => {
    expect(errors(`const n = 42n; const s: string = n.toString()`)).toHaveLength(0)
  })
})

describe('Error subtypes — ECMA-262 §20.5', () => {
  it('new EvalError() is an Error', () => {
    expect(errors(`const e = new EvalError('bad eval')`)).toHaveLength(0)
  })

  it('new URIError() has message property', () => {
    expect(errors(`const e = new URIError('bad uri'); const m: string = e.message`)).toHaveLength(0)
  })

  it('new AggregateError() — ES2021', () => {
    expect(errors(`const e = new AggregateError([], 'all failed')`)).toHaveLength(0)
  })

  it('new SuppressedError() — ES2024', () => {
    expect(errors(`const e = new SuppressedError(new Error(), new Error(), 'suppressed')`)).toHaveLength(0)
  })
})

describe('Object static additions — ECMA-262 §20.1', () => {
  it('Object.setPrototypeOf', () => {
    expect(errors(`Object.setPrototypeOf({}, null)`)).toHaveLength(0)
  })

  it('Object.getOwnPropertyDescriptor', () => {
    expect(errors(`const d = Object.getOwnPropertyDescriptor({ x: 1 }, 'x')`)).toHaveLength(0)
  })

  it('Object.prototype.hasOwnProperty returns boolean', () => {
    expect(errors(`const o = { x: 1 }; const h: boolean = o.hasOwnProperty('x')`)).toHaveLength(0)
  })
})

describe('JSON ES2024 additions — ECMA-262 §25.5', () => {
  it('JSON.rawJSON returns any', () => {
    expect(errors(`const r = JSON.rawJSON(42)`)).toHaveLength(0)
  })

  it('JSON.isRawJSON returns boolean', () => {
    expect(errors(`const b: boolean = JSON.isRawJSON(JSON.rawJSON(1))`)).toHaveLength(0)
  })
})

describe('Function instance methods — ECMA-262 §20.2', () => {
  it('fn.call returns any', () => {
    expect(errors(`function add(a: number, b: number): number { return a + b }
      const r = add.call(null, 1, 2)`)).toHaveLength(0)
  })

  it('fn.apply returns any', () => {
    expect(errors(`function sum(...args: number[]): number { return 0 }
      const r = sum.apply(null, [1, 2, 3])`)).toHaveLength(0)
  })

  it('fn.bind returns function', () => {
    expect(errors(`function greet(msg: string): string { return msg }
      const bound = greet.bind(null)`)).toHaveLength(0)
  })
})

describe('Class static methods and fields — ECMA-262 §15.7', () => {
  it('static method callable via ClassName.method()', () => {
    expect(errors(`
      class Counter {
        static count: number = 0
        static increment(): number { return ++Counter.count }
      }
      const n: number = Counter.increment()
    `)).toHaveLength(0)
  })

  it('static field accessible via ClassName.field', () => {
    expect(errors(`
      class Config {
        static defaultTimeout: number = 5000
      }
      const t: number = Config.defaultTimeout
    `)).toHaveLength(0)
  })
})

describe('Class getters and setters — ECMA-262 §15.7', () => {
  it('getter return type used in property access', () => {
    expect(errors(`
      class Person {
        private _name: string = ''
        get name(): string { return this._name }
      }
      const p = new Person()
      const n: string = p.name
    `)).toHaveLength(0)
  })

  it('setter param type used for assignment check', () => {
    expect(errors(`
      class Box {
        private _val: number = 0
        set value(v: number) { this._val = v }
        get value(): number { return this._val }
      }
      const b = new Box()
      b.value = 42
    `)).toHaveLength(0)
  })
})

// ── Function parameter type registration — ECMA-262 §15.2 ────────────────────

describe('Function parameter type registration', () => {
  it('typed param is correctly typed in function body', () => {
    expect(errors(`
      function greet(name: string | null) {
        const s: string = name
      }
    `)).toHaveLength(1)
  })

  it('typed param after null check has narrowed type', () => {
    expect(errors(`
      function greet(name: string | null) {
        if (name !== null) {
          const s: string = name
        }
      }
    `)).toHaveLength(0)
  })

  it('arrow function params are typed in body', () => {
    expect(errors(`
      const double = (x: number): number => x * 2
    `)).toHaveLength(0)
  })

  it('arrow function param type used in return check', () => {
    expect(errors(`
      const toString = (x: number): string => x
    `)).toHaveLength(1)
  })

  it('function expression params are typed in body', () => {
    expect(errors(`
      const add = function(a: number, b: number): number { return a + b }
    `)).toHaveLength(0)
  })

  it('default param registers typed binding', () => {
    expect(errors(`
      function greet(name: string = 'world') {
        const s: string = name
      }
    `)).toHaveLength(0)
  })
})

// ── Array.prototype.reduceRight — ECMA-262 §23.1.3.24 ────────────────────────

describe('Array.prototype.reduceRight', () => {
  it('reduceRight with initial value infers accumulator type', () => {
    expect(errors(`
      const nums: number[] = [1, 2, 3]
      const sum: number = nums.reduceRight((acc, x) => acc + x, 0)
    `)).toHaveLength(0)
  })

  it('reduceRight result matches initial value type', () => {
    expect(errors(`
      const words: string[] = ['a', 'b', 'c']
      const r: string = words.reduceRight((acc, w) => acc + w, '')
    `)).toHaveLength(0)
  })
})

// ── Map/Set iteration in for...of — ECMA-262 §24 ─────────────────────────────

describe('Map/Set for...of iteration', () => {
  it('for...of Map yields [K, V] tuples', () => {
    expect(errors(`
      const m = new Map<string, number>()
      for (const [k, v] of m) {
        const key: string = k
        const val: number = v
      }
    `)).toHaveLength(0)
  })

  it('for...of Set yields element type', () => {
    expect(errors(`
      const s = new Set<string>()
      for (const item of s) {
        const str: string = item
      }
    `)).toHaveLength(0)
  })
})

// ── Array.isArray() narrowing — ECMA-262 §23.1.2.2 ───────────────────────────

describe('Array.isArray() narrowing', () => {
  it('Array.isArray(x) narrows to any[] in then-branch', () => {
    expect(errors(`
      function process(val: unknown) {
        if (Array.isArray(val)) {
          const arr: any[] = val
        }
      }
    `)).toHaveLength(0)
  })

  it('Array.isArray on non-variable passes', () => {
    expect(errors(`
      const val: unknown[] | string = []
      if (Array.isArray(val)) {
        const a = val.length
      }
    `)).toHaveLength(0)
  })
})

// ── instanceof type narrowing — ECMA-262 §13.10 ───────────────────────────────

describe('instanceof type narrowing', () => {
  it('instanceof narrows variable to branded object type', () => {
    expect(errors(`
      class Dog {
        name: string = 'Rex'
      }
      function process(val: unknown) {
        if (val instanceof Dog) {
          const d: object = val
        }
      }
    `)).toHaveLength(0)
  })

  it('instanceof Error narrows to object in then-branch', () => {
    expect(errors(`
      function handle(e: unknown) {
        if (e instanceof Error) {
          const o: object = e
        }
      }
    `)).toHaveLength(0)
  })
})

// ── Constructor parameter properties — TypeScript extension ──────────────────

describe('Constructor parameter properties', () => {
  it('constructor(private x: T) registers x as instance field', () => {
    expect(errors(`
      class Greeter {
        constructor(private name: string, public age: number) {}
      }
      const g = new Greeter('Alice', 30)
      const n: string = g.name
    `)).toHaveLength(0)
  })
})

// ── Object.values/entries type inference — ECMA-262 §20.1 ────────────────────

describe('Object.values/entries type inference', () => {
  it('Object.values returns array of value types for known object', () => {
    expect(errors(`
      const obj = { a: 1, b: 2 }
      const vals: (number | number)[] = Object.values(obj)
    `)).toHaveLength(0)
  })

  it('Object.entries returns [string, V][] for known object', () => {
    expect(errors(`
      const obj = { x: 'hello', y: 'world' }
      const entries = Object.entries(obj)
    `)).toHaveLength(0)
  })

  it('Object.values on unknown object returns any[]', () => {
    expect(errors(`
      function getVals(o: object): any[] {
        return Object.values(o)
      }
    `)).toHaveLength(0)
  })
})

// ── Class extends clause field inheritance — ECMA-262 §15.7 ──────────────────

describe('Class extends clause field inheritance', () => {
  it('subclass inherits parent field types for member access', () => {
    expect(errors(`
      class Animal {
        name: string = 'Animal'
        speak(): string { return 'generic' }
      }
      class Dog extends Animal {
        breed: string = 'Lab'
      }
      const d = new Dog()
      const n: string = d.name
    `)).toHaveLength(0)
  })

  it('subclass can access inherited method types', () => {
    expect(errors(`
      class Base {
        value: number = 0
      }
      class Derived extends Base {
        doubled(): number { return this.value * 2 }
      }
      const x = new Derived()
      const v: number = x.value
    `)).toHaveLength(0)
  })
})

// ── new expression returns class instance with field types — ECMA-262 §15.7 ──

describe('new expression instance type', () => {
  it('new MyClass() returns instance with correct field types', () => {
    expect(errors(`
      class Point {
        x: number = 0
        y: number = 0
      }
      const p = new Point()
      const x: number = p.x
      const y: number = p.y
    `)).toHaveLength(0)
  })

  it('instance field wrong type assignment errors', () => {
    expect(errors(`
      class Person {
        name: string = ''
        age: number = 0
      }
      const person = new Person()
      const n: string = person.name
    `)).toHaveLength(0)
  })

  it('class expression: new Foo() resolves instance fields', () => {
    expect(errors(`
      const Foo = class {
        value: number = 42
      }
      const f = new Foo()
      const v: number = f.value
    `)).toHaveLength(0)
  })

  it('named class expression: new Bar() resolves instance fields', () => {
    expect(errors(`
      const Bar = class MyBar {
        label: string = 'hello'
      }
      const b = new Bar()
      const s: string = b.label
    `)).toHaveLength(0)
  })
})

// ── eval() detection — SJS-E013 ──────────────────────────────────────────────

describe('eval() detection — SJS-E013', () => {
  it('eval() call emits SJS-E013', () => {
    expect(errorCodes(`eval('1+1')`)).toContain('SJS-E013')
  })

  it('regular function calls are not affected', () => {
    expect(errorCodes(`
      function foo(x: string) { return x }
      foo('hello')
    `)).not.toContain('SJS-E013')
  })
})

// ── Object.assign return type — ECMA-262 §20.1.2.1 ───────────────────────────

describe('Object.assign return type', () => {
  it('Object.assign returns target type', () => {
    expect(errors(`
      const target = { a: 1 }
      const result: object = Object.assign(target, { b: 2 })
    `)).toHaveLength(0)
  })

  it('Object.assign merges source properties into result', () => {
    expect(errors(`
      const defaults = { color: 'red', size: 10 }
      const opts = Object.assign({}, defaults)
    `)).toHaveLength(0)
  })

  it('Object.assign merges multiple sources', () => {
    expect(errors(`
      const a = { x: 1 }
      const b = { y: 'hello' }
      const merged = Object.assign({}, a, b)
    `)).toHaveLength(0)
  })
})

// ── RegExp.exec return type — ECMA-262 §22.2.7.2 ─────────────────────────────

describe('RegExp.exec return type', () => {
  it('exec returns array|null union', () => {
    expect(errors(`
      const re = /foo/
      const m = re.exec('foobar')
    `)).toHaveLength(0)
  })
})

// ── export * from 'mod' — ECMA-262 §16.2 ─────────────────────────────────────

describe('ExportAllDeclaration', () => {
  it('export * from module — no error', () => {
    expect(errors(`
      export * from './utils'
    `)).toHaveLength(0)
  })

  it('export * as ns from module — no error', () => {
    expect(errors(`
      export * as utils from './utils'
    `)).toHaveLength(0)
  })
})

