# SJS vs Rust

## TL;DR

Rust and SJS solve different problems. Rust is for systems programming where you need zero-cost abstractions, no runtime, and manual memory control. SJS is for application programming where you need a fast type-safe language that targets JavaScript runtimes and (at v2.0) native binaries. If you are writing an OS, a database engine, or a game engine — use Rust. If you are writing a REST API, a CLI, a serverless function, or a web app — SJS is faster to ship.

That said, SJS borrows heavily from Rust: sum types, `Result<T,E>`, `Option<T>`, `match`, exhaustiveness checking, and sound null safety. The ideas are Rust's; the syntax and runtime model are approachable.

---

## Conceptual Overlap

SJS took the best ideas from Rust's type system and made them accessible to JavaScript developers:

| Rust concept | SJS equivalent | Notes |
|-------------|---------------|-------|
| `enum` + pattern matching | Sum types + `match` | Exhaustive in both |
| `Result<T, E>` | `Result<T, E>` | First-class in SJS, not a stdlib import |
| `Option<T>` | `T?` nullable | SJS uses postfix `?` for conciseness |
| Trait objects | Structural interfaces | Implicit satisfaction; no `impl Trait` needed |
| Generics | Generics | SJS invariant by default; +T/-T in v1.1 |
| `panic!` | `panic` built-in | Unrecoverable error in both |
| `match` exhaustiveness | `match` exhaustiveness | Both emit a compile error for missing arms |
| `unwrap()` | `.unwrap()` | Same semantics — panics on Err/None |

---

## Code Comparison

### Sum types and match

```rust
// Rust
enum Shape {
    Circle(f64),
    Rect(f64, f64),
}

fn area(s: Shape) -> f64 {
    match s {
        Shape::Circle(r) => std::f64::consts::PI * r * r,
        Shape::Rect(w, h) => w * h,
    }
}
```

```sjs
// SJS
type Shape =
  | Circle(radius: number)
  | Rect(width: number, height: number)

function area(s: Shape): number {
  return match s {
    Circle(r)    => Math.PI * r * r,
    Rect(w, h)   => w * h,
  }
}
```

Both emit a compile error if a variant is missing from `match`. SJS syntax is lighter — no `::` namespace, no `std::` prefix.

### Result

```rust
// Rust
fn read_file(path: &str) -> Result<String, std::io::Error> {
    std::fs::read_to_string(path)
}

let content = read_file("config.toml")?;  // ? propagates Err
```

```sjs
// SJS
import { File } from "@superjs/std-native/io"

function readFile(path: string): Result<string, Error> {
  return File.readText(path)
}

const content = readFile("config.toml").unwrap()  // panics on Err
// or: pattern-match it
match readFile("config.toml") {
  Ok(text)  => console.log(text),
  Err(e)    => console.error(e.message),
}
```

SJS does not have `?` propagation syntax at v1.0 (planned post-v1.0). Use `match` or `.unwrap()` explicitly.

### Null safety

```rust
// Rust
fn find_user(id: u32) -> Option<User> {
    db.get(id)
}

let user = find_user(42)?;           // propagates None
let name = user.name.to_uppercase();
```

```sjs
// SJS
function findUser(id: number): User? {
  return db.get(id)
}

const user = findUser(42)
const name = user?.name.toUpperCase() ?? "UNKNOWN"
```

---

## Key Differences

### Memory model

Rust has ownership, borrowing, and lifetimes. Zero garbage collector, zero runtime. Every allocation is explicit and the compiler proves it is safe.

SJS (JS target) uses V8's GC. SJS (native target, v2.0) uses reference counting for heap values — no borrow checker, but also no data races because SJS does not have shared mutable state across threads by default (green threads communicate via channels, not shared memory).

| | Rust | SJS (JS) | SJS (native, v2.0) |
|-|------|---------|-------------------|
| Memory management | Ownership + borrow checker | V8 GC | Reference counting |
| Borrow checker | Yes | No | No |
| Data races | Impossible (compile-time) | No threads (single event loop) | Prevented by channel model |
| Heap allocation control | Explicit | None (GC) | Implicit RC |

### Learning curve

Rust's borrow checker is the steepest learning curve in mainstream languages. Fighting the borrow checker is a rite of passage. Lifetimes, `&`, `&mut`, `Box<T>`, `Rc<T>`, `Arc<T>` — weeks of adjustment even for experienced developers.

SJS has no borrow checker. Types, null safety, and sum types are the whole story. A JavaScript developer is productive in SJS within hours.

### Compile speed

| Project size | Rust (debug) | Rust (release) | SJS |
|-------------|------------|--------------|-----|
| 10k LOC cold | ~15–40 s | ~60–120 s | ≤ 2 s (JS) / ≤ 10 s (native) |
| Single file warm | ~2–5 s | N/A | ≤ 100 ms |

Rust's compile times are a known pain point. SJS is significantly faster because it does not need to monomorphize across a full dependency tree for every build (incremental graph-based).

### Ecosystem

| | Rust | SJS |
|-|------|-----|
| Package registry | crates.io — 150k+ crates | npm (JS target) + git (native, v2.0) |
| npm compatibility | No | Yes (JS target) |
| Web development | Via WASM only | Native (JS target); WASM (v2.0) |
| Node.js integration | Via napi-rs bindings | Native |

### Runtime targets

| Target | Rust | SJS v1.0 | SJS v2.0 |
|--------|------|---------|---------|
| Node.js | Via napi-rs | Native | Native |
| Browser | Via WASM | Via JS output | Via WASM |
| Native binary | Yes | No | Yes |
| WASM | Yes | No | Yes |
| Cloudflare Workers | Via WASM | Yes (JS) | Yes (JS + WASM) |

---

## Performance

For CPU-bound work, Rust is faster — ownership semantics enable zero-copy algorithms the GC and RC models cannot express without unsafe code. For I/O-bound work (most web services), the gap vanishes behind network and database latency.

| Workload | Rust | SJS (JS target) | SJS (native v2.0) |
|---------|------|----------------|-----------------|
| JSON parse 1MB | ~5 ms | ~10–15 ms (V8) | ~8–12 ms (RC) |
| HTTP server (req/s) | ~200–400k | ~80–120k (Node) | ~150–250k |
| JSON serialize | ~3 ms | ~8 ms | ~6 ms |
| SHA-256 10MB | ~5 ms | ~50 ms | ~8 ms |
| Idle memory | < 1 MB | ~30–50 MB (Node) | ~2–5 MB |

For a REST API handling 10k req/s — both are more than fast enough. Choose based on ecosystem, not benchmarks.

---

## When to Choose Rust

- Embedded systems, OS components, game engines, database internals
- Memory budget in KB, not MB
- You need zero runtime — no GC, no RC, no allocator
- CPU-bound workloads where 2× throughput matters
- Your team already knows Rust

## When to Choose SJS

- Web APIs, CLIs, serverless functions, monorepos
- Team comes from JavaScript / TypeScript
- You want npm ecosystem access
- You want to ship in hours, not days
- v2.0: native binary + WASM from the same source as your existing JS code
