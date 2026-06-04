// B1: dynamic type keyword — runtime-checked, bypasses static type system
// Use dynamic when interoping with untyped APIs

const raw: dynamic = JSON.parse('{"x":1}');
const count: dynamic = raw.count; // no type error — dynamic propagates

function processRaw(data: dynamic): string {
  return String(data.value);
}

// In strict mode, dynamic usage emits SJS-W001
// const strict: dynamic = 42; // SJS-W001: avoid dynamic in strict mode

// dynamic is consistent with any type
const n: number = raw; // allowed — dynamic is assignable to everything
const s: string = raw; // also allowed
