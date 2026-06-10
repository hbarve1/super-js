# SJS vs Java, Kotlin, and Swift

## Overview

Java, Kotlin, and Swift are mature, production-proven languages with large ecosystems. They are not direct competitors to SJS for most use cases — each dominates a different niche. This document covers where SJS overlaps, where it does not, and why a developer from these ecosystems might reach for SJS.

---

## SJS vs Java

### TL;DR

Java is the enterprise backend language. Verbose, verbose, and verbose — but battle-tested at every scale. SJS targets the same backend use case with 5× less boilerplate, sound null safety, and a compile time measured in seconds, not minutes.

### Code comparison

```java
// Java — a simple HTTP handler
@RestController
public class UserController {
    @Autowired
    private UserRepository repo;

    @GetMapping("/user/{id}")
    public ResponseEntity<UserDto> getUser(@PathVariable Long id) {
        return repo.findById(id)
            .map(user -> ResponseEntity.ok(new UserDto(user.getName(), user.getEmail())))
            .orElse(ResponseEntity.notFound().build());
    }
}
```

```sjs
// SJS — same logic with Fastify wrapper
import { FastifyRequest, FastifyReply } from "fastify"

async function getUser(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> {
  const user: User? = await repo.find(req.params.id)
  match user {
    null => reply.code(404).send(),
    _    => reply.send({ name: user.name, email: user.email }),
  }
}
```

### Key differences

| | Java | SJS |
|-|------|-----|
| Null safety | Optional (since Java 8; not enforced) | Always on |
| Null annotations | `@Nullable`, `@NonNull` (IDE-only) | `T?` — compiler enforced |
| Verbosity | High — boilerplate everywhere | Low — JS syntax |
| Startup time | 1–5 s (JVM cold start) | < 500 ms (Node) / < 50 ms (native v2.0) |
| Memory (idle) | ~150–300 MB (JVM) | ~30–50 MB (Node) / ~3–8 MB (native v2.0) |
| Pattern matching | Records + sealed classes (Java 21+) | Sum types + `match` — always exhaustive |
| `Optional<T>` | Yes — wrapper type, not enforced | `T?` — language-level, enforced |
| Generics | Erased at runtime; wildcards | Monomorphized (native); erased (JS) |
| Build system | Maven / Gradle (complex) | `superjs build` (one command) |
| Cold compile 10k LOC | ~30–120 s (Gradle) | ≤ 2 s |
| Ecosystem | Maven Central — 500k+ | npm — 2M+ |

### Java's strengths SJS does not match (at v1.0)
- JVM ecosystem: Spring, Hibernate, Quarkus, Micronaut — decades of battle-tested libraries
- Java EE / Jakarta EE compliance for enterprise mandates
- JVM JIT: long-running process performance is excellent
- Multi-threading: real OS threads with synchronized primitives (SJS green threads in v2.0)
- Android development (SJS targets no mobile platform)

---

## SJS vs Kotlin

### TL;DR

Kotlin is the best thing to happen to JVM development. It took Java's best ideas, added null safety, data classes, extension functions, and coroutines, and made them feel natural. SJS and Kotlin are philosophically similar — both are pragmatic, safety-first languages targeting working developers. The difference is platform: Kotlin owns the JVM + Android + Compose; SJS owns JS + npm + (v2.0) native/WASM.

### Code comparison

```kotlin
// Kotlin
data class User(val name: String, val email: String)

fun findUser(id: Long): User? = repository.findById(id)

fun handleRequest(id: Long): String {
    return findUser(id)?.let { "${it.name} <${it.email}>" } ?: "not found"
}
```

```sjs
// SJS
type User = { name: string; email: string }

function findUser(id: number): User? {
  return repository.find(id)
}

function handleRequest(id: number): string {
  const user = findUser(id)
  return user != null ? `${user.name} <${user.email}>` : "not found"
}
```

### Feature alignment

| Feature | Kotlin | SJS |
|---------|--------|-----|
| Null safety | Yes — `T?`, enforced | Yes — `T?`, enforced |
| `!!` non-null assertion | Yes (unsafe) | No — banned |
| Smart casts / narrowing | Yes | Yes |
| Data classes | `data class` | Plain class + structural interface |
| Sealed classes | Yes | Sum types (lighter syntax) |
| `when` exhaustive matching | Yes (on sealed) | `match` — always exhaustive |
| Extension functions | Yes | No (post-v1.0consideration) |
| Coroutines | Yes — `suspend` / `Flow` | `async`/`await` + `Promise` |
| Generics variance | Declaration-site `in`/`out` | Invariant default; `+T`/`-T` in v1.1 |
| Structural interfaces | No — `interface` + `implements` | Yes — implicit satisfaction |
| One formatter | `ktfmt` / `ktlint` | `superjs format` |
| Compile time (10k LOC) | ~10–30 s (Gradle) | ≤ 2 s |
| Target platforms | JVM, Android, KMM, JS (experimental) | JS, native (v2.0), WASM (v2.0) |

### Kotlin Multiplatform vs SJS v2.0

Kotlin Multiplatform (KMM) compiles shared code to JVM, iOS (via Kotlin/Native), and JavaScript. SJS v2.0 compiles to JS, native binary, and WASM. The overlap:

| | Kotlin Multiplatform | SJS v2.0 |
|-|---------------------|---------|
| JS target | Yes | Yes |
| Native binary | Yes (via Kotlin/Native → LLVM) | Yes (LLVM) |
| WASM | Yes (experimental) | Yes (Tier 1) |
| Android | Yes | No |
| iOS | Yes (via KMM) | No |
| npm ecosystem | No | Yes |
| Shared code approach | Expect/actual mechanism | Same language everywhere |

KMM's `expect`/`actual` pattern adds significant complexity. SJS has no platform-specific API — the standard library adapts to the target; the code does not change.

### When to choose Kotlin over SJS
- Android development — Kotlin is the official language
- JVM ecosystem is a hard requirement (Spring, Hibernate)
- Your shared business logic also needs iOS via KMM
- Team is deeply JVM-invested

### When to choose SJS over Kotlin
- Team is JavaScript/TypeScript background
- npm ecosystem access is required
- You want 2 s compile times, not 30 s
- Node.js is the deployment target
- v2.0: native + WASM without a JVM runtime

---

## SJS vs Swift

### TL;DR

Swift is Apple's language for iOS, macOS, and increasingly server-side Swift on Linux. It has the best type system of the three here — sound, expressive, with ownership annotations and concurrency actors. SJS borrows from Swift conceptually. The gap is ecosystem: Swift's server-side story is smaller than Node.js's by orders of magnitude. SJS does not target Apple platforms.

### Code comparison

```swift
// Swift
enum Shape {
    case circle(radius: Double)
    case rect(width: Double, height: Double)
}

func area(_ s: Shape) -> Double {
    switch s {
    case .circle(let r):    return Double.pi * r * r
    case .rect(let w, let h): return w * h
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
    Circle(r)  => Math.PI * r * r,
    Rect(w, h) => w * h,
  }
}
```

Swift enum + exhaustive switch was a direct inspiration for SJS sum types + `match`. The semantics are nearly identical.

### Feature comparison

| Feature | Swift | SJS |
|---------|-------|-----|
| Sound type system | Yes | Yes |
| Null safety | `Optional<T>` / `T?` | `T?` |
| `!` force-unwrap | Yes (unsafe) | Banned |
| Sum types / enums | Yes — associated values | Yes — sum types |
| Exhaustive match | Yes | Yes |
| Generics | Yes — with associated types | Yes |
| Protocol-oriented (structural) | Protocols — nominal, not structural | Structural interfaces |
| Ownership / borrowing | `borrowing`, `consuming` (Swift 5.9) | RC (v2.0); no explicit borrow |
| Actors (concurrency) | Yes (Swift 5.5+) | Channels (v2.0 native) |
| `async`/`await` | Yes | Yes |
| Compile target | macOS/iOS/Linux | JS, native (v2.0), WASM (v2.0) |
| npm ecosystem | No | Yes |

### Swift's strengths SJS does not have
- iOS and macOS — SJS targets no Apple platform
- SwiftUI — no equivalent in SJS
- ARC (automatic reference counting) with non-optional `!` prohibition in Swift 6
- Swift 6 data race safety — compiler-enforced, stronger than SJS green-thread model
- Objective-C interop — SJS has no equivalent (by design)

### When to choose Swift over SJS
- iOS, macOS, watchOS, tvOS development
- Server-side with Apple Silicon Mac deployment and Objective-C interop
- You want the most advanced ownership + concurrency safety model available

### When to choose SJS over Swift
- Node.js backend — Swift server ecosystem is small
- npm packages required
- Web frontend + backend from one language
- Team is JavaScript/TypeScript background
- v2.0: native + WASM with npm interop

---

## Summary Table

| | Java | Kotlin | Swift | SJS |
|-|------|--------|-------|-----|
| Null safety | Optional, not enforced | Yes, `T?` enforced | Yes, `T?` enforced | Yes, `T?` enforced |
| `!` force-unwrap | `!= null` check | Yes (unsafe) | Yes (unsafe) | **Banned** |
| Sum types | Sealed classes (Java 21) | Sealed classes | `enum` with values | First-class |
| Exhaustive `match` | Switch expressions | `when` (sealed only) | `switch` | Always |
| Sound type system | Mostly (generics gap) | Mostly | Yes | Yes |
| Compile time | Slow (Gradle) | Moderate | Moderate | Fast |
| npm ecosystem | No | No | No | Yes |
| Native binary | JVM bytecode | JVM / Kotlin/Native | Yes | v2.0 |
| WASM | Via TeaVM/J2Wasm | Experimental | No | v2.0 Tier 1 |
| iOS/Android | Android (Java) | Android (Kotlin) | iOS/macOS | No |
| Server-side | Spring, Quarkus | Ktor, Spring | Vapor, Hummingbird | Fastify, Express |
| Startup time | 1–5 s | 1–5 s | < 100 ms | < 500 ms (Node) |
| Team fit | Enterprise / Android | Android / JVM | Apple ecosystem | JS / Node.js |

---

## The Common Thread: What SJS Learned from All Three

- **From Java:** Interfaces as contracts. Checked exceptions → `Result<T,E>` (without the boilerplate)
- **From Kotlin:** `T?` syntax, smart casts / narrowing, data-oriented types, `when` exhaustiveness — SJS `match` is Kotlin's `when` with better syntax
- **From Swift:** Sum types with associated values, protocol-oriented design as structural interfaces, the principle that `!` force-unwrap should not exist

SJS is what you get when you take these lessons from statically-typed OOP languages and apply them to a JavaScript-native language with a sound type system from the start.
