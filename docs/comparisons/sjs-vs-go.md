# SJS vs Go

## TL;DR

Go and SJS target the same developer: the backend engineer who wants fast compile times, simple tooling, and correct concurrent programs. Go got there first and has a massive ecosystem. SJS brings the same philosophy to the JavaScript world — with a sound type system, sum types, and first-class null safety that Go lacks. At v2.0, SJS also produces native binaries and cross-compiles, just like Go.

If your team is already on Go and happy — stay. If your team is on Node.js and wants Go-like simplicity and safety — SJS is the answer without abandoning the npm ecosystem.

---

## Philosophy Alignment

Go and SJS share the same core philosophy:

| Principle | Go | SJS |
|-----------|-----|-----|
| Fast compile times | Yes — sub-second incremental | Yes — ≤ 2 s cold, ≤ 100 ms warm |
| Simple, small language surface | Yes — ~25 keywords | Yes — JS surface + types |
| One formatter, no config | `gofmt` | `superjs format` |
| One build tool, no config | `go build` | `superjs build` |
| Static binary distribution | Yes | Yes (v2.0 native target) |
| Implicit interface satisfaction | Yes — structural | Yes — structural |
| No inheritance | Yes — composition only | Yes — composition only |
| First-class error handling | `error` return value | `Result<T, E>` |

SJS goes further than Go on type safety: sound null safety, exhaustive `match`, and sum types that make illegal states unrepresentable.

---

## Code Comparison

### Error handling

```go
// Go
func readFile(path string) (string, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return "", err
    }
    return string(data), nil
}

content, err := readFile("config.toml")
if err != nil {
    log.Fatal(err)
}
```

```sjs
// SJS
import { File } from "@superjs/std-native/io"

function readFile(path: string): Result<string, Error> {
  return File.readText(path)
}

match readFile("config.toml") {
  Ok(content) => process(content),
  Err(e)      => console.error(e.message),
}
```

Both force you to handle the error. SJS's `Result<T, E>` is a sum type — the compiler enforces exhaustive handling in `match`. Go's `(T, error)` pattern is a convention the compiler does not fully enforce (`_` silently discards errors).

```go
// Go — this compiles and runs; error silently ignored
content, _ := readFile("config.toml")
```

```sjs
// SJS — no equivalent; you must match or .unwrap() explicitly
```

### Null / zero values

Go has zero values — every type has a zero value (`0`, `""`, `false`, `nil` for pointers). This means a `string` can come back as `""` when you expected data, and you have no compile-time signal it might be empty.

```go
// Go
func findUser(id int) *User {
    // returns nil if not found — caller must check
    return db.Find(id)
}

user := findUser(42)
fmt.Println(user.Name)  // nil dereference panic if not found — runtime crash
```

```sjs
// SJS
function findUser(id: number): User? {
  return db.find(id)
}

const user = findUser(42)
console.log(user.name)        // SJS-E005: user is nullable — compile error
console.log(user?.name ?? "?") // OK
```

SJS's `T?` is explicit. You cannot accidentally treat a nullable value as non-nullable — the compiler stops you.

### Sum types

Go has no sum types. The idiomatic Go pattern is interface + type switch:

```go
// Go — interface + type switch (no exhaustiveness check)
type Shape interface{ area() float64 }
type Circle struct{ R float64 }
type Rect struct{ W, H float64 }

func describe(s Shape) string {
    switch v := s.(type) {
    case Circle:
        return fmt.Sprintf("circle r=%.1f", v.R)
    case Rect:
        return fmt.Sprintf("rect %gx%g", v.W, v.H)
    // forget Triangle — compiles fine, runtime: wrong output, not a panic
    }
    return "unknown"
}
```

```sjs
// SJS — exhaustive match, compile error if Triangle missing
type Shape =
  | Circle(radius: number)
  | Rect(width: number, height: number)
  | Triangle(base: number, height: number)

function describe(s: Shape): string {
  return match s {
    Circle(r)      => `circle r=${r}`,
    Rect(w, h)     => `rect ${w}x${h}`,
    // Triangle missing → SJS-E009: non-exhaustive match
  }
}
```

### Interfaces

```go
// Go — implicit interface satisfaction (same as SJS)
type Stringer interface {
    String() string
}

type User struct{ Name string }
func (u User) String() string { return u.Name }

func print(s Stringer) { fmt.Println(s.String()) }
print(User{"Alice"})  // works — User satisfies Stringer implicitly
```

```sjs
// SJS — same implicit satisfaction
interface Stringer {
  toString(): string
}

class User {
  constructor(readonly name: string) {}
  toString(): string { return this.name }
}

function print(s: Stringer): void { console.log(s.toString()) }
print(new User("Alice"))  // OK — User satisfies Stringer structurally
```

Both use structural, implicit interface satisfaction. No `implements`, no `impl Trait`. This is one of Go's best ideas — SJS adopts it wholesale.

### Generics

Go added generics in 1.18 (2022). The syntax is verbose and the type constraint system is still maturing.

```go
// Go 1.18+ generics
func Map[T, U any](s []T, f func(T) U) []U {
    result := make([]U, len(s))
    for i, v := range s {
        result[i] = f(v)
    }
    return result
}
```

```sjs
// SJS — same concept, lighter syntax
function map<T, U>(items: T[], f: (item: T) => U): U[] {
  return items.map(f)
}
```

---

## Key Differences

| | Go | SJS |
|-|----|-----|
| Type system soundness | No — `interface{}` / `any` escape | Yes |
| Null safety | No — nil panics at runtime | Yes — `T?` enforced at compile time |
| Sum types | No — interface + type switch | Yes — first-class |
| Exhaustive pattern matching | No | Yes |
| Error handling enforcement | Convention (`_, err`) | Enforced by `Result<T,E>` + `match` |
| Concurrency model | Goroutines + channels | Green threads + channels (v2.0 native) |
| GC | Tracing GC | V8 GC (JS) / RC (native v2.0) |
| npm ecosystem | No | Yes (JS target) |
| Browser/WASM target | Via WASM (stdlib gaps) | JS native + WASM (v2.0) |
| JSX / frontend | No | Yes |
| Language size | ~25 keywords | JS + ~12 SJS keywords |
| Generics | Yes (since 1.18) | Yes |
| Self-hosted compiler | Yes (since 1.5) | v2.0 |

---

## Concurrency

Go's goroutines and channels are excellent. SJS v2.0 native target uses the same model:

```go
// Go — goroutine + channel
ch := make(chan int)
go func() { ch <- compute() }()
result := <-ch
```

```sjs
// SJS v2.0 native — green thread + channel
import { Channel, spawn } from "@superjs/std-native/sync"

const ch = Channel<number>()
spawn(() => ch.send(compute()))
const result = ch.recv()
```

On the JS target (v1.0), concurrency is the Node.js event loop — `async`/`await` and `Promise`. No goroutine equivalent; `async` functions are typed and checked.

---

## Distribution and Tooling

| | Go | SJS v1.0 | SJS v2.0 |
|-|----|---------|---------|
| Single binary output | Yes | No (JS bundle) | Yes |
| Cross-compile | Yes — any OS/arch | No | Yes |
| `go install` equivalent | `go install` | `npm install -g` | `superjs install` |
| Static binaries | Yes | No | Yes |
| Docker scratch images | Yes | No | Yes |
| Formatter | `gofmt` | `superjs format` | `superjs format` |
| Linter | `golint` / `staticcheck` | `superjs lint` (17 rules) | `superjs lint` |
| Test runner | `go test` | Via Jest/Vitest | `superjs test --target native` |

---

## Performance

For I/O-bound workloads (typical REST APIs), Go and SJS are in the same tier. Go has an edge on raw throughput for compute-intensive work; SJS on the JS target benefits from V8's JIT.

| Workload | Go | SJS (JS/Node) | SJS (native v2.0) |
|---------|-----|--------------|-----------------|
| HTTP req/s (hello world) | ~200–350k | ~80–120k | ~150–250k |
| JSON parse 1MB | ~8 ms | ~10 ms | ~10 ms |
| Idle memory | ~5–15 MB | ~30–50 MB (Node) | ~3–8 MB |
| Cold start (Lambda) | ~100–200 ms | ~200–400 ms | ~5–20 ms |

---

## When to Choose Go

- Pure backend service, no JavaScript/browser involvement at all
- Team is already Go-fluent
- You need goroutine-per-connection concurrency at scale (> 100k concurrent connections)
- You want the largest possible native binary ecosystem (cgo, C interop, mature tooling)

## When to Choose SJS

- Team comes from Node.js / TypeScript
- You want npm packages + native binary output from the same language (v2.0)
- You want sound null safety and exhaustive `match` (Go has neither)
- You ship to both Node.js and native (CLIs, lambdas, edge) from one codebase
- You want the Go philosophy applied to the JavaScript world
