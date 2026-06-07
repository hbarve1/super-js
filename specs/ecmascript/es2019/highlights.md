# ES2019 Highlights — Super.js Reference

**Edition**: ES10 / ES2019
**Versioned spec**: https://262.ecma-international.org/10.0/
**Living spec**: https://tc39.es/ecma262/

---

## Overview

ES2019 polished the language with practical additions: nested array
flattening, a round-trip inverse to `Object.entries`, optional catch bindings,
string whitespace methods, a stable sort guarantee, and a human-readable
`Symbol.description`. These are mostly utility-layer improvements; all of them
are fully supported or substantially tracked in Super.js.

---

## 1. Array.prototype.flat  §23.1.3.11

**Living spec**: https://tc39.es/ecma262/#sec-array.prototype.flat
**Versioned**: https://262.ecma-international.org/10.0/#sec-array.prototype.flat

### What the spec says

`Array.prototype.flat(depth?)` recursively flattens nested arrays up to
`depth` levels deep (defaulting to `1`). It returns a new array; the original
is unmodified. Elements that are not arrays are included as-is. Holes in
sparse arrays are removed.

### SJS type rules

- `flat(1)` (the default) returns `FlatArray<T, 1>[]` — SJS infers the
  element type one level deep.
- `flat(depth)` where `depth` is a literal number is typed accordingly up to
  a practical limit. Depth as a runtime `number` variable widens the element
  type to `any[]`.
- Calling `flat()` on a non-nested array is a no-op by spec but SJS will
  emit a linter hint (`prefer-flat-map`) when `flat(1)` is immediately
  preceded by `.map(...)`.

### SJS code examples

```sjs
// One-level flatten (default)
const nested: number[][] = [[1, 2], [3, 4], [5]];
const flat1: number[] = nested.flat();
// [1, 2, 3, 4, 5]

// Deep flatten with explicit depth
const deep: number[][][] = [[[1, 2]], [[3]], [[4, 5]]];
const flat2: number[] = deep.flat(2);
// [1, 2, 3, 4, 5]

// Mixed depth — result widens
const mixed: (number | number[])[] = [1, [2, 3], 4, [5]];
const flatMixed: number[] = mixed.flat();
// [1, 2, 3, 4, 5]

// Collecting results from async map (common pattern)
async function fetchAll(urls: string[]): Promise<string[]> {
  const pages: string[][] = await Promise.all(
    urls.map(async (url: string): Promise<string[]> => {
      const res: Response = await fetch(url);
      const text: string = await res.text();
      return text.split("\n");
    })
  );
  return pages.flat();
}

// Filtering and flattening (filter-map idiom)
const maybes: (number | null)[] = [1, null, 2, null, 3];
const numbers: number[] = (maybes.filter((x): x is number => x !== null)).flat();
```

---

## 2. Array.prototype.flatMap  §23.1.3.12

**Living spec**: https://tc39.es/ecma262/#sec-array.prototype.flatmap
**Versioned**: https://262.ecma-international.org/10.0/#sec-array.prototype.flatmap

### What the spec says

`Array.prototype.flatMap(callback, thisArg?)` is equivalent to
`.map(callback).flat(1)` but more efficient — it performs both operations in
a single pass. The callback receives `(element, index, array)` and may return
either a single value or an array.

### SJS type rules

- If the callback `(v: T) => U` returns a non-array `U`, the result is `U[]`.
- If the callback returns `U[]`, the result is `U[]` (one level flattened).
- If the callback return type is `U | U[]`, SJS widens to `U[]`.
- Returning a nested `U[][]` from the callback does NOT flatten the inner
  level — `flatMap` only flattens one level by spec.

### SJS code examples

```sjs
// Split sentences into words (expand each element)
const sentences: string[] = ["hello world", "foo bar baz"];
const words: string[] = sentences.flatMap(
  (s: string) => s.split(" ")
);
// ["hello", "world", "foo", "bar", "baz"]

// Filter-and-map in one pass (return [] to skip, [value] to include)
const raw: (number | string)[] = [1, "a", 2, "b", 3];
const doubled: number[] = raw.flatMap((x: number | string): number[] =>
  typeof x === "number" ? [x * 2] : []
);
// [2, 4, 6]

// Generate index-value pairs
const items: string[] = ["a", "b", "c"];
const indexed: [number, string][] = items.flatMap(
  (item: string, i: number): [number, string][] => [[i, item]]
);
// [[0, "a"], [1, "b"], [2, "c"]]

// Expand tree nodes into a flat list
type TreeNode = { value: number; children: TreeNode[] };

function flattenTree(nodes: TreeNode[]): number[] {
  return nodes.flatMap((node: TreeNode): number[] => [
    node.value,
    ...flattenTree(node.children),
  ]);
}
```

---

## 3. Object.fromEntries  §20.1.2.6

**Living spec**: https://tc39.es/ecma262/#sec-object.fromentries
**Versioned**: https://262.ecma-international.org/10.0/#sec-object.fromentries

### What the spec says

`Object.fromEntries(iterable)` is the inverse of `Object.entries`. It accepts
any iterable of `[key, value]` pairs (not just arrays) and returns a new plain
object with those key-value pairs. Keys are coerced to strings.

### SJS type rules

- `Object.fromEntries(entries: [string, T][])` returns `{ [key: string]: T }`.
- When the iterable is a `Map<K, V>`, SJS infers `{ [key: string]: V }` (key
  coerced to string).
- The return type is always an index-signature record in SJS v1; named-key
  inference from literal entry arrays is planned for generics milestone.

### SJS code examples

```sjs
// Round-trip with Object.entries
const original: { a: number; b: number } = { a: 1, b: 2 };
const doubled: { [key: string]: number } = Object.fromEntries(
  Object.entries(original).map(([k, v]: [string, number]) => [k, v * 2])
);
// { a: 2, b: 4 }

// Build object from Map
const map: Map<string, number> = new Map([["x", 10], ["y", 20]]);
const obj: { [key: string]: number } = Object.fromEntries(map);
// { x: 10, y: 20 }

// Query string parsing
function parseQuery(query: string): { [key: string]: string } {
  return Object.fromEntries(
    query
      .replace(/^\?/, "")
      .split("&")
      .map((pair: string): [string, string] => {
        const [k, v] = pair.split("=");
        return [decodeURIComponent(k), decodeURIComponent(v ?? "")];
      })
  );
}

// Invert a lookup table
function invertMap(
  m: { [key: string]: string }
): { [key: string]: string } {
  return Object.fromEntries(
    Object.entries(m).map(([k, v]: [string, string]) => [v, k])
  );
}
```

---

## 4. Optional Catch Binding  §14.15

**Living spec**: https://tc39.es/ecma262/#sec-try-statement
**Versioned**: https://262.ecma-international.org/10.0/#sec-try-statement

### What the spec says

Before ES2019, every `catch` clause required a binding: `catch (e)`. ES2019
makes the binding optional, allowing `catch { ... }` when the caught value is
irrelevant. The spec amends the grammar in §14.15.

### SJS type rules

- `catch { }` (no binding) is parsed and emitted as-is for `--target es2019`+.
- For earlier targets, SJS adds a synthetic `catch (_e)` binding to maintain
  compatibility.
- When a binding IS present in SJS, its type defaults to `unknown` in strict
  mode (safer than `any`) — `catch (e: unknown)` or `catch (e: Error)`.

### SJS code examples

```sjs
// No binding needed — just detecting failure
function canParse(json: string): boolean {
  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
}

// Typed catch binding (recommended in strict mode)
async function safeFetch(url: string): Promise<string | null> {
  try {
    const res: Response = await fetch(url);
    return res.text();
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("fetch failed:", err.message);
    }
    return null;
  }
}

// Optional binding for cleanup-only catch
function withFallback<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
```

---

## 5. String.trimStart / String.trimEnd  §22.1.3.31

**Living spec (trimStart)**: https://tc39.es/ecma262/#sec-string.prototype.trimstart
**Living spec (trimEnd)**: https://tc39.es/ecma262/#sec-string.prototype.trimend
**Versioned**: https://262.ecma-international.org/10.0/#sec-string.prototype.trimstart

### What the spec says

`String.prototype.trimStart()` removes leading whitespace and
`String.prototype.trimEnd()` removes trailing whitespace. Both return a new
string. They complement the existing `String.prototype.trim()`. The
non-standard aliases `trimLeft`/`trimRight` are also retained in Annex B.

### SJS type rules

Both accept no arguments and return `string`. SJS enforces this — calling with
arguments is a type error.

### SJS code examples

```sjs
// Remove leading whitespace only (preserve trailing)
const indented: string = "  hello world  ";
const leftTrimmed: string = indented.trimStart(); // "hello world  "
const rightTrimmed: string = indented.trimEnd();  // "  hello world"

// Parsing code — preserve indentation meaning
function parseLines(source: string): string[] {
  return source
    .split("\n")
    .map((line: string) => line.trimEnd())  // strip trailing spaces only
    .filter((line: string) => line.length > 0);
}
```

---

## 6. Symbol.prototype.description  §20.4.3.2

**Living spec**: https://tc39.es/ecma262/#sec-symbol.prototype.description
**Versioned**: https://262.ecma-international.org/10.0/#sec-symbol.prototype.description
**SJS status**: ⚠️ Partial

### What the spec says

`Symbol.prototype.description` is a getter that returns the optional string
description passed to `Symbol(description)`, or `undefined` if none was given.
Before ES2019, to get the description you had to call `.toString()` and strip
the `Symbol(...)` wrapper.

### SJS type rules

- `symbol.description` is typed `string | undefined`.
- Comparing `symbol.description` to a string requires a null-guard in strict
  mode.

### SJS code examples

```sjs
const sym: symbol = Symbol("my-event");
const desc: string | undefined = sym.description;

if (desc !== undefined) {
  console.log(`Symbol name: ${desc}`); // "my-event"
}

// Use in debug logging
function describeSymbol(s: symbol): string {
  return s.description ?? "(anonymous symbol)";
}
```

---

## 7. Array.prototype.sort Stability  §23.1.3.28

**Living spec**: https://tc39.es/ecma262/#sec-array.prototype.sort
**Versioned**: https://262.ecma-international.org/10.0/#sec-array.prototype.sort

### What the spec says

Prior to ES2019, the spec permitted unstable sort algorithms. ES2019 mandates
that `Array.prototype.sort` must be stable — elements with equal comparison
keys must appear in their original relative order.

### SJS type rules

No type-system impact. The stability guarantee is a pure runtime behavioral
change. SJS simply relies on the host engine's conformant implementation.

### SJS code examples

```sjs
type Task = { name: string; priority: number };

const tasks: Task[] = [
  { name: "alpha",   priority: 2 },
  { name: "beta",    priority: 1 },
  { name: "gamma",   priority: 2 },
  { name: "delta",   priority: 1 },
];

// Stable sort: tasks with equal priority keep original order
const sorted: Task[] = [...tasks].sort(
  (a: Task, b: Task) => a.priority - b.priority
);
// beta, delta, alpha, gamma — within priority 1 and 2, original order preserved
```

---

## Section Quick-Reference

| Feature | ECMA-262 § | Living URL | SJS Status |
|---------|-----------|------------|------------|
| `Array.prototype.flat` | §23.1.3.11 | https://tc39.es/ecma262/#sec-array.prototype.flat | ✅ |
| `Array.prototype.flatMap` | §23.1.3.12 | https://tc39.es/ecma262/#sec-array.prototype.flatmap | ✅ |
| `Object.fromEntries` | §20.1.2.6 | https://tc39.es/ecma262/#sec-object.fromentries | ✅ |
| Optional catch binding | §14.15 | https://tc39.es/ecma262/#sec-try-statement | ✅ |
| `String.prototype.trimStart` | §22.1.3.31 | https://tc39.es/ecma262/#sec-string.prototype.trimstart | ✅ |
| `String.prototype.trimEnd` | §22.1.3.31 | https://tc39.es/ecma262/#sec-string.prototype.trimend | ✅ |
| `Symbol.prototype.description` | §20.4.3.2 | https://tc39.es/ecma262/#sec-symbol.prototype.description | ⚠️ |
| `Array.prototype.sort` stability | §23.1.3.28 | https://tc39.es/ecma262/#sec-array.prototype.sort | ✅ |
| `Function.prototype.toString` revision | §20.2.3.5 | https://tc39.es/ecma262/#sec-function.prototype.tostring | ✅ |
| Well-formed `JSON.stringify` | §25.5.2 | https://tc39.es/ecma262/#sec-json.stringify | ✅ |

---

## See Also

- `specs/ecmascript/es2018/highlights.md` — object rest/spread, `Promise.finally`
- `specs/ecmascript/es2020/highlights.md` — BigInt, optional chaining, nullish coalescing
- `specs/ecmascript/README.md` — full compliance matrix
- `prototype/src/typeChecker/index.ts` — runtime type-checker implementation
