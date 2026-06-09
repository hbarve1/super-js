# SJS vs Dart

## TL;DR

Dart is a well-designed language that compiles to JavaScript and native binaries — on paper, the closest competitor to SJS's v2.0 vision. In practice, Dart's story is inseparable from Flutter, and Flutter is inseparable from mobile UI. If you want to build a cross-platform mobile app, use Dart + Flutter — nothing touches it. If you want to build a Node.js backend, a CLI, or a web service with npm ecosystem access, SJS is the better fit.

---

## Where Dart and SJS Agree

Both languages converged on the same design decisions independently:

| Design choice | Dart | SJS |
|--------------|------|-----|
| Sound type system | Yes (since Dart 2.0) | Yes |
| Non-nullable by default | Yes (since Dart 2.12 NNBD) | Yes — always |
| `T?` nullable syntax | Yes | Yes |
| Pattern matching | Yes (since Dart 3.0) | Yes |
| Exhaustive `switch`/`match` | Yes (sealed classes) | Yes (sum types) |
| Compiles to JavaScript | Yes | Yes |
| Compiles to native binary | Yes (AOT) | Yes (v2.0, LLVM) |
| Compiles to WASM | Yes (experimental) | Yes (v2.0, Tier 1) |
| One formatter (`dart format`) | Yes | Yes (`superjs format`) |
| One build tool | Yes | Yes |

---

## Code Comparison

### Null safety

```dart
// Dart
String? findUser(int id) {
  return db.find(id);
}

final user = findUser(42);
print(user!.toUpperCase());  // ! asserts non-null — runtime crash if null
print(user?.toUpperCase() ?? "UNKNOWN");  // safe
```

```sjs
// SJS
function findUser(id: number): string? {
  return db.find(id)
}

const user = findUser(42)
console.log(user!.toUpperCase())      // SJS-E: ! banned — use narrowing
console.log(user?.toUpperCase() ?? "UNKNOWN")  // OK
```

SJS bans `!` non-null assertion entirely — no escape hatch to bypass null safety. Dart allows `!` which can cause runtime `Null check operator used on a null value` crashes, defeating the purpose of null safety.

### Sum types / sealed classes

```dart
// Dart 3.0 — sealed class + exhaustive switch
sealed class Shape {}
class Circle extends Shape { final double radius; Circle(this.radius); }
class Rect extends Shape { final double w, h; Rect(this.w, this.h); }

double area(Shape s) => switch (s) {
  Circle(radius: var r) => 3.14159 * r * r,
  Rect(w: var w, h: var h) => w * h,
};
```

```sjs
// SJS
type Shape =
  | Circle(radius: number)
  | Rect(width: number, height: number)

function area(s: Shape): number {
  return match s {
    Circle(r)  => Math.PI * r * r,
    Rect(w, h) => w * h,
  }
}
```

SJS's sum types are lighter — no class hierarchy, no `sealed` keyword, no constructor boilerplate. Dart's sealed classes were retrofitted onto a class-based OOP language; SJS sum types are first-class.

### Async / await

```dart
// Dart
Future<String> fetchData(String url) async {
  final response = await http.get(Uri.parse(url));
  return response.body;
}
```

```sjs
// SJS
async function fetchData(url: string): Promise<string> {
  const response = await fetch(url)
  return response.text()
}
```

Nearly identical — both adopted the `async`/`await` model. Dart's `Future<T>` = SJS's `Promise<T>`.

### Generics

```dart
// Dart
class Stack<T> {
  final _items = <T>[];
  void push(T item) => _items.add(item);
  T? pop() => _items.isEmpty ? null : _items.removeLast();
}
```

```sjs
// SJS
class Stack<T> {
  private items: T[] = []
  push(item: T): void { this.items.push(item) }
  pop(): T? { return this.items.pop() ?? null }
}
```

Almost identical. SJS's `T?` vs Dart's `T?` — same syntax, same meaning.

---

## Key Differences

### Ecosystem

| | Dart | SJS |
|-|------|-----|
| Primary ecosystem | `pub.dev` (~40k packages) | npm (2M+ packages, JS target) |
| npm compatibility | No | Yes (JS target) |
| Flutter | Yes — the primary use case | No |
| Node.js | Limited (`dart:io` covers basics) | Native |
| Express/Fastify/Hono | No equivalent | Via npm wrappers |
| React/Next.js | No | Yes (JSX on by default) |
| Prisma, Drizzle, Kysely | No | Via npm wrappers |

Dart's package ecosystem is primarily Flutter packages. Non-Flutter server-side Dart is a small community. SJS on the JS target has access to all 2M npm packages.

### Target audience

Dart is designed for Flutter first. The Dart team's priorities, blog posts, language decisions, and conference talks are dominated by Flutter mobile development. Server-side Dart (`dart:frog`, `shelf`) is community-maintained and lags.

SJS is designed for Node.js backend developers first. The tooling, stdlib, CLI, and interop story are all backend-first.

### The `!` operator

Dart allows `!` to assert non-null:

```dart
String name = user!.name;  // compiles; crashes at runtime if user is null
```

This is a soundness hole — the null safety guarantee can be bypassed. In large codebases, `!` usage accumulates and null crashes return. SJS bans `!` at the compiler level.

### `dynamic` vs Dart's `dynamic`

Both languages have `dynamic` as the escape hatch. Dart's `dynamic` is closer to TypeScript's `any` — it is mostly unchecked.

```dart
// Dart — dynamic is minimally checked
dynamic x = "hello";
x.nonExistent();  // compiles; NoSuchMethodError at runtime
```

```sjs
// SJS — dynamic is explicitly runtime-checked
const x: dynamic = "hello"
x.nonExistent()  // compiles; SJS-RuntimeError at runtime with stack trace
```

SJS's `dynamic` inserts explicit runtime checks and produces structured error messages. Dart's `dynamic` silently forwards to the runtime.

### Language complexity

Dart has:
- Classes, abstract classes, mixins, extension methods, extension types
- Cascade operator `..`
- Null-aware cascade `?..`
- `late` keyword for deferred initialization
- `covariant` for variance
- `@sealed` + sealed classes (Dart 3)
- `typedef` (two syntaxes)
- Factories, named constructors, redirecting constructors

SJS has: classes, interfaces, sum types, generics. That is the whole OOP surface.

---

## Compilation Targets

| Target | Dart | SJS v1.0 | SJS v2.0 |
|--------|------|---------|---------|
| JavaScript (Node.js) | Yes (`dart compile js`) | Yes | Yes |
| JavaScript (browser) | Yes | Yes | Yes |
| Native binary (AOT) | Yes | No | Yes (LLVM) |
| Native binary (JIT) | Yes (VM) | No | No (AOT only) |
| WASM | Experimental (Dart 3.4+) | No | Yes (Tier 1) |
| iOS / Android | Via Flutter | No | No |
| Web (Flutter Web) | Via Flutter | No | No |

Dart's WASM output is designed for Flutter Web, not general-purpose WASM. SJS's WASM output (v2.0) targets `wasm32-wasi` (server/edge) and browser `wasm32-unknown` with auto-generated TypeScript bindings.

---

## Performance

| Workload | Dart (native AOT) | Dart (JS output) | SJS (JS/Node) | SJS (native v2.0) |
|---------|-----------------|----------------|--------------|-----------------|
| HTTP req/s | ~150–250k | ~40–80k | ~80–120k | ~150–250k |
| Cold start (Lambda) | ~10–50 ms | ~200–400 ms | ~200–400 ms | ~5–20 ms |
| JSON parse 1MB | ~6 ms | ~15 ms | ~10 ms | ~10 ms |
| Idle memory | ~5–10 MB | ~30–50 MB | ~30–50 MB | ~3–8 MB |

Dart AOT and SJS native (v2.0) are in the same performance tier. On the JS target, Dart's JS output is slower than Node.js's V8 because Dart's JS codegen is not optimized for Node.js performance characteristics.

---

## When to Choose Dart

- You are building a Flutter mobile/desktop app — Dart is the only option
- You want one language for mobile + backend with shared business logic in Flutter
- Your team is already Flutter-trained

## When to Choose SJS

- Backend services, APIs, CLIs, serverless functions
- Team comes from JavaScript / TypeScript / Node.js
- You need the npm ecosystem (no Flutter dependency)
- You want `!` banned, not just discouraged
- v2.0: native binary + WASM from the same source as your Node.js code
