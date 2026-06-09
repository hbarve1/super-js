# ES2018 Highlights — Super.js Reference

**Edition**: ES9 / ES2018
**Versioned spec**: https://262.ecma-international.org/9.0/
**Living spec**: https://tc39.es/ecma262/

---

## Overview

ES2018 extended the asynchronous programming model (async iteration,
`for-await-of`) and brought rest/spread syntax into object literals and
destructuring patterns. `Promise.finally` completed the three-part Promise
API. RegExp gained named capture groups and lookbehind assertions. Super.js
gives type-checked versions of all these features.

---

## 1. Object Rest / Spread  §13.2.5 / §14.3.3

**Spread in object literals — Living spec**: https://tc39.es/ecma262/#sec-object-initializer
**Rest in object destructuring — Living spec**: https://tc39.es/ecma262/#sec-destructuring-binding-patterns
**Versioned (spread)**: https://262.ecma-international.org/9.0/#sec-object-initializer
**Versioned (rest)**: https://262.ecma-international.org/9.0/#sec-destructuring-binding-patterns

### What the spec says

**Spread** (`{ ...obj }`) in an object literal copies all own enumerable
string-keyed properties from `obj` into the new object. It is evaluated left to
right; later properties override earlier ones.

**Rest** (`{ a, ...rest }`) in a destructuring pattern collects all own
enumerable string-keyed properties not already matched into a fresh object.

Both were already defined for arrays in ES2015; ES2018 extended the syntax to
objects.

### SJS type rules

- **Spread**: When spreading a typed record `{ a: number; b: string }` into an
  object literal, SJS merges the spread type's fields into the result type. If
  two spreads define the same key, the later spread's type wins.
- **Rest**: The rest element receives a type that is the original record type
  minus the already-destructured keys. SJS tracks this as a mapped type
  internally (`Omit<T, K>` semantics), though the surface syntax for Omit is
  planned for a later version.
- Spreading `any` widens the result to `any`.

### SJS code examples

```sjs
// Typed object spread — merging records
type Point = { x: number; y: number };
type Point3D = { x: number; y: number; z: number };

const p2: Point = { x: 1, y: 2 };
const p3: Point3D = { ...p2, z: 3 };

// Override pattern — later key wins
const defaults: { color: string; size: number; weight: number } = {
  color: "blue",
  size: 12,
  weight: 100,
};
const custom: { color: string; size: number; weight: number } = {
  ...defaults,
  color: "red",   // overrides defaults.color
};

// Object rest destructuring — typed remainder
const user: { id: number; name: string; email: string; role: string } = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  role: "admin",
};

const { id, name, ...profile } = user;
// id: number, name: string
// profile: { email: string; role: string }

// Immutable update pattern (common in React reducers)
type State = { count: number; loading: boolean; error: string | null };

function reduce(state: State, delta: Partial<State>): State {
  return { ...state, ...delta };
}

// Spreading typed arrays of records
function mergeConfigs(
  base: { timeout: number; retries: number },
  ...overrides: Array<{ timeout?: number; retries?: number }>
): { timeout: number; retries: number } {
  return overrides.reduce(
    (acc: { timeout: number; retries: number }, o) => ({ ...acc, ...o }),
    base
  );
}

// Rest in function params (collect remaining named options)
function connect(
  host: string,
  {
    port,
    ssl,
    ...extras
  }: { port: number; ssl: boolean; [key: string]: any }
): void {
  console.log(host, port, ssl, extras);
}
```

### Compiler target notes

| `--target` | Transformation |
|------------|----------------|
| `es5`      | Spread → `Object.assign({}, ...)`, rest → manual property deletion loop |
| `es2015`   | Same as es5 for object spread/rest (not in es2015) |
| `es2018`+  | Pass-through |

---

## 2. Promise.finally  §27.2.5.3

**Living spec**: https://tc39.es/ecma262/#sec-promise.prototype.finally
**Versioned**: https://262.ecma-international.org/9.0/#sec-promise.prototype.finally

### What the spec says

`Promise.prototype.finally(onFinally)` registers a callback that runs whether
the promise resolves or rejects, and then re-propagates the original settled
value (or rejection reason). Crucially, the callback receives no arguments and
its return value is ignored unless it throws or returns a rejected promise.

### SJS type rules

- `finally` accepts `(onFinally: () => void | Promise<void>): Promise<T>`.
- The return type is `Promise<T>` — the same `T` as the parent promise. SJS
  enforces this: the `finally` callback cannot change the resolved value.
- Returning a non-`void` value from the callback is flagged as `SJS-W002`
  (unused return value in `finally` callback).

### SJS code examples

```sjs
async function loadData(url: string): Promise<string> {
  let isLoading: boolean = true;

  return fetch(url)
    .then((res: Response) => res.text())
    .finally(() => {
      isLoading = false;
      // void return — cleanup only, no value propagation
    });
}

// Resource cleanup pattern
class Connection {
  async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    await this.begin();
    return fn().finally(() => this.rollbackOrCommit());
  }

  private async begin(): Promise<void> { /* ... */ }
  private async rollbackOrCommit(): Promise<void> { /* ... */ }
}
```

---

## 3. Async Iteration / for-await-of  §14.7.5.4 / §27.1

**Living spec (for-await-of)**: https://tc39.es/ecma262/#sec-for-in-and-for-of-statements
**Living spec (async iteration protocol)**: https://tc39.es/ecma262/#sec-asynciterator-interface
**Versioned**: https://262.ecma-international.org/9.0/#sec-for-in-and-for-of-statements
**SJS status**: ⚠️ Partial — parsed and emitted, type checking incomplete

### What the spec says

`for await (const x of iterable)` works like `for...of` but calls `.next()` on
an async iterator, awaiting each `Promise<IteratorResult>` before proceeding.
Async generators (`async function*`) produce async iterables.

### SJS type rules (planned)

- The iterable in `for await` must implement `AsyncIterable<T>` (i.e., have a
  `[Symbol.asyncIterator]()` method returning `AsyncIterator<T>`).
- The loop variable is typed as `T`.
- `async function*` returns `AsyncGenerator<T, TReturn, TNext>`.

### SJS code examples

```sjs
// Consuming an async iterable (e.g., a stream)
async function readLines(stream: AsyncIterable<string>): Promise<string[]> {
  const lines: string[] = [];
  for await (const line of stream) {
    lines.push(line);
  }
  return lines;
}

// Async generator — produces values asynchronously
async function* paginate(
  url: string,
  pageSize: number
): AsyncGenerator<object[], void, unknown> {
  let page: number = 0;
  while (true) {
    const res: Response = await fetch(`${url}?page=${page}&size=${pageSize}`);
    const data: object[] = await res.json();
    if (data.length === 0) break;
    yield data;
    page++;
  }
}

// Consuming the async generator
async function collectAll(url: string): Promise<object[]> {
  const all: object[] = [];
  for await (const page of paginate(url, 50)) {
    all.push(...page);
  }
  return all;
}
```

---

## 4. RegExp Named Capture Groups  §22.2

**Living spec**: https://tc39.es/ecma262/#sec-regexp-regular-expression-objects
**SJS status**: ⚠️ Partial

### What the spec says

Named capture groups use the syntax `(?<name>...)`. Matched groups are
accessible via `match.groups.name`. Named backreferences use `\k<name>`.

### SJS code examples

```sjs
const DATE_RE = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;

function parseDate(s: string): { year: string; month: string; day: string } | null {
  const m = s.match(DATE_RE);
  if (!m || !m.groups) return null;
  const { year, month, day } = m.groups;
  return { year, month, day };
}
```

---

## 5. RegExp Lookbehind Assertions  §22.2.1

**Living spec**: https://tc39.es/ecma262/#sec-patterns
**SJS status**: ⚠️ Partial — passes through to runtime

### What the spec says

Positive lookbehind `(?<=...)` and negative lookbehind `(?<!...)` match a
position that is (or is not) preceded by the pattern. Unlike lookaheads,
lookbehinds were not in the ES2015 spec and require ES2018+ runtime support.

### SJS code examples

```sjs
// Extract numbers preceded by a dollar sign
const prices = "$10, €20, $30";
const dollarAmounts = prices.match(/(?<=\$)\d+/g);
// ["10", "30"]

// Negative lookbehind: word not after "no "
const text = "yes please, no thanks, yes indeed";
const yeses = text.match(/(?<!no )yes/g);
// ["yes please", "yes indeed"]  — filters "no yes" patterns
```

---

## Section Quick-Reference

| Feature | ECMA-262 § | Living URL | SJS Status |
|---------|-----------|------------|------------|
| Object spread in literals | §13.2.5 | https://tc39.es/ecma262/#sec-object-initializer | ✅ |
| Object rest in destructuring | §14.3.3 | https://tc39.es/ecma262/#sec-destructuring-binding-patterns | ⚠️ |
| `Promise.prototype.finally` | §27.2.5.3 | https://tc39.es/ecma262/#sec-promise.prototype.finally | ✅ |
| `for await...of` | §14.7.5.4 | https://tc39.es/ecma262/#sec-for-in-and-for-of-statements | ⚠️ |
| Async generators | §15.6 | https://tc39.es/ecma262/#sec-asyncgenerator-definitions | ⚠️ |
| RegExp named capture groups | §22.2 | https://tc39.es/ecma262/#sec-regexp-regular-expression-objects | ⚠️ |
| RegExp lookbehind | §22.2.1 | https://tc39.es/ecma262/#sec-patterns | ⚠️ |
| RegExp `s` (dotAll) flag | §22.2.1 | https://tc39.es/ecma262/#sec-patterns | ⚠️ |
| RegExp Unicode property escapes | §22.2.1 | https://tc39.es/ecma262/#sec-patterns | ⚠️ |

---

## See Also

- `specs/ecmascript/es2017/highlights.md` — `async`/`await`, `Object.entries`
- `specs/ecmascript/es2019/highlights.md` — `Array.flat`, `Object.fromEntries`
- `specs/ecmascript/README.md` — full compliance matrix
- `prototype/src/typeChecker/index.ts` — runtime type-checker implementation
