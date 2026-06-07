# ECMAScript 2016 (ES7) — Highlights for Super.js

ECMA-262 7th Edition (2016). A deliberately small release — only two new features.
Both are used directly in SJS source and emitted in compiled output when the target
is ES2016 or later.

---

## 1. Exponentiation Operator `**` — §13.6

`base ** exponent` raises `base` to the power of `exponent`. Equivalent to
`Math.pow(base, exponent)` but as an infix operator. Right-associative:
`2 ** 3 ** 2` is `2 ** (3 ** 2)` = `2 ** 9` = 512.

The assignment form `**=` is also defined: `x **= n` is shorthand for `x = x ** n`.

**What SJS uses it for:**
SJS types both operands and the result as `number` (or `bigint` if both operands
are `bigint`). The SJS type-checker enforces that the exponent is not a unary
negation directly applied to a non-parenthesised base (which would be a SyntaxError
in the spec: `-2 ** 2` is illegal; `(-2) ** 2` is required). When targeting ES5,
the SJS compiler downgrades `**` to `Math.pow(base, exponent)`.

Linter rule **SJS-L022 (prefer-exponentiation-operator)** flags calls to
`Math.pow(x, n)` where both arguments are literals or identifiers and suggests
replacing them with `x ** n`.

```sjs
// SJS source
let squared: number = 4 ** 2;          // 16
let cubed: number = 2 ** 3;            // 8
let rightAssoc: number = 2 ** 3 ** 2;  // 512

// bigint exponentiation
let big: bigint = 2n ** 10n;           // 1024n

// Assignment form
let base: number = 3;
base **= 4;                            // base is now 81

// SJS-L022: this triggers a suggestion
let area: number = Math.pow(radius, 2);   // prefer: radius ** 2

// Compiled ES5 output (downlevel)
var squared = Math.pow(4, 2);
var cubed = Math.pow(2, 3);
var rightAssoc = Math.pow(2, Math.pow(3, 2));

// Compiled ES2016+ output (pass-through)
const squared = 4 ** 2;
const cubed = 2 ** 3;
const rightAssoc = 2 ** 3 ** 2;
```

---

## 2. Array.prototype.includes — §23.1.3.13

`arr.includes(searchElement, fromIndex?)` returns `true` if `searchElement` is
found in `arr`, starting at `fromIndex` (default 0). Unlike `indexOf`, it correctly
handles `NaN` comparisons (uses SameValueZero rather than strict equality).

The optional `fromIndex` may be negative, in which case it is treated as
`Math.max(0, arr.length + fromIndex)`.

**What SJS uses it for:**
SJS types `Array<T>.includes(value: T): boolean`. The type-checker enforces that
the search value is assignable to the array element type — narrower than the
permissive JavaScript runtime, which accepts any value. This catches bugs where
a value of the wrong type is searched.

Linter rule **SJS-L023 (prefer-array-includes)** flags `arr.indexOf(x) !== -1`
patterns and suggests `arr.includes(x)` instead. When the compiler targets ES5,
`includes` is polyfilled via `indexOf(x) >= 0` in the emitted output (configurable
with `--polyfill=includes`).

```sjs
// SJS typed includes
let primes: number[] = [2, 3, 5, 7, 11, 13];
let hasEleven: bool = primes.includes(11);   // true
let hasFour: bool = primes.includes(4);      // false

// NaN-safe (unlike indexOf)
let data: number[] = [1, NaN, 3];
let hasNaN: bool = data.includes(NaN);       // true
// data.indexOf(NaN) === -1  (indexOf cannot find NaN)

// fromIndex parameter
let tags: string[] = ["a", "b", "c", "b", "d"];
let hasB: bool = tags.includes("b", 2);      // true (found at index 3)

// SJS-L023 fires on this pattern:
if (roles.indexOf("admin") !== -1) { /* ... */ }  // prefer: roles.includes("admin")

// Compiled ES5 polyfill output (--polyfill=includes)
var hasEleven = primes.indexOf(11) >= 0;
// NaN edge case polyfill
var hasNaN = (function(arr, val) {
  return arr.some(function(el) {
    return el === val || (val !== val && el !== el);
  });
})(data, NaN);
```

---

## Summary Table

| Feature                    | ECMA-262 §       | SJS Role                                                  |
|----------------------------|------------------|-----------------------------------------------------------|
| Exponentiation operator `**` | §13.6          | `number`/`bigint` typed; SJS-L022; ES5 → Math.pow        |
| Array.prototype.includes   | §23.1.3.13       | Typed element search; SJS-L023; ES5 → indexOf polyfill   |
