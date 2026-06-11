// match/03-exhaustiveness.sjs — SJS-E007: non-exhaustive match, three ways to fix it

// SJS-E007 fires at compile time when a match expression does not cover every
// variant of a sum type.  This is intentional: adding a new variant to a type
// causes every non-exhaustive match site to become a compile error, forcing you
// to handle the new case explicitly.
//
// Three ways to satisfy exhaustiveness:
//   1. Add an arm for every missing variant     (preferred — fully type-safe)
//   2. Add a wildcard arm `_ => ...`            (opts out of exhaustiveness)
//   3. Use an `assertNever` helper              (runtime guard + type-level proof)

// --- Status type with four variants ---

type Status = | Active | Inactive | Suspended | Deleted

// COMMENTED trigger — this would fire SJS-E007 at compile time:
//
// function describeWrong(s: Status): string {
//   return match s {
//     Active   => "running"
//     Inactive => "stopped"
//     // Missing: Suspended and Deleted
//     // SJS-E007: match on `Status` does not cover variants: Suspended, Deleted
//   }
// }

// --- FIX 1: Add all missing arms (preferred) ---
// Every variant is named.  When a new variant is added to `Status`,
// this function becomes a compile error immediately — forcing an update.

function describeFix1(s: Status): string {
  return match s {
    Active    => "running"
    Inactive  => "stopped"
    Suspended => "suspended"
    Deleted   => "deleted"
  }
}

// --- FIX 2: Wildcard arm (intentional catch-all) ---
// Use `_` when you genuinely don't care about the remaining variants.
// The wildcard arm silences SJS-E007 for all unmatched variants.
// Trade-off: new variants added later are silently handled by `_` — no warning.

function describeFix2(s: Status): string {
  return match s {
    Active   => "running"
    Inactive => "stopped"
    _        => "other"
  }
}

// --- FIX 3: assertNever — runtime guard + exhaustiveness proof ---
// `assertNever` takes `never`.  If a variant reaches it, TypeScript/SJS proves
// you forgot an arm at compile time.  If somehow reached at runtime, it throws.

function assertNever(x: never): never {
  throw new Error("Unhandled variant: " + JSON.stringify(x))
}

function describeFix3(s: Status): string {
  return match s {
    Active    => "running"
    Inactive  => "stopped"
    Suspended => "suspended"
    Deleted   => "deleted"
    // If Status grows a new variant (e.g. Archived), the compiler narrows
    // `s` to `Archived` here, making the `never` argument type-incorrect.
    // _ => assertNever(s)   ← uncomment to see the compile-time proof
  }
}

// --- Exhaustiveness with struct variants ---

type Shape =
  | Circle { radius: number }
  | Rectangle { width: number; height: number }
  | Triangle { base: number; height: number }

// All three variants covered — exhaustive, no `_` needed.
function area(s: Shape): number {
  return match s {
    Circle { radius }           => Math.PI * radius * radius
    Rectangle { width; height } => width * height
    Triangle { base; height }   => 0.5 * base * height
  }
}

// Mixed coverage: only some variants named, rest caught by wildcard.
function shapeName(s: Shape): string {
  return match s {
    Circle { _ }    => "circle"
    _               => "polygon"
  }
}

// --- Exhaustiveness with tuple variants ---

type MaybeNumber =
  | Some(number)
  | None

function unwrapOr(m: MaybeNumber, fallback: number): number {
  return match m {
    Some(n) => n
    None    => fallback
  }
}

// --- Demos ---

console.log(describeFix1(Active))     // running
console.log(describeFix1(Inactive))   // stopped
console.log(describeFix1(Suspended))  // suspended
console.log(describeFix1(Deleted))    // deleted

console.log(describeFix2(Active))     // running
console.log(describeFix2(Suspended))  // other
console.log(describeFix2(Deleted))    // other

console.log(describeFix3(Active))     // running
console.log(describeFix3(Deleted))    // deleted

console.log(area(Circle { radius: 3 }))                     // 28.274...
console.log(area(Rectangle { width: 4; height: 5 }))        // 20
console.log(area(Triangle { base: 6; height: 4 }))          // 12

console.log(shapeName(Circle { radius: 1 }))                // circle
console.log(shapeName(Rectangle { width: 2; height: 3 }))   // polygon

console.log(unwrapOr(Some(7), 0))   // 7
console.log(unwrapOr(None, 42))     // 42
