# SJS-L011 — BiDi control character rejected

**Severity:** error  
**Category:** security  
**Stage:** Stage 1

## Description

A Unicode bidirectional-control codepoint (U+202A–U+202E or U+2066–U+2069) was found in the
source file and has been rejected as a hard error. This diagnostic is emitted in two situations:

1. **Inside an identifier — always rejected** regardless of any configuration flag.
   BiDi codepoints inside identifiers can make two visually-identical identifiers resolve to
   different symbols, enabling silent logic substitution attacks. There is no mode in which
   this is permitted or downgraded to a warning.

2. **Anywhere in the file when `--strict-bidi` is active.** The `--strict-bidi` flag upgrades
   the default `SJS-W012` warning to a hard error for every occurrence of a BiDi codepoint,
   including those in string literals and comments. `--strict-bidi` is enabled automatically by
   `superjs build --release`.

This code is the strict-mode complement to `SJS-W012`. See that entry for background on the
Trojan Source attack (CVE-2021-42574) and for the full list of affected codepoints.

### Affected codepoints

| Codepoint | Name | Always-reject in identifier? | Reject in `--strict-bidi`? |
|---|---|---|---|
| U+202A | LEFT-TO-RIGHT EMBEDDING | yes | yes |
| U+202B | RIGHT-TO-LEFT EMBEDDING | yes | yes |
| U+202C | POP DIRECTIONAL FORMATTING | yes | yes |
| U+202D | LEFT-TO-RIGHT OVERRIDE | yes | yes |
| U+202E | RIGHT-TO-LEFT OVERRIDE | yes | yes |
| U+2066 | LEFT-TO-RIGHT ISOLATE | yes | yes |
| U+2067 | RIGHT-TO-LEFT ISOLATE | yes | yes |
| U+2068 | FIRST STRONG ISOLATE | yes | yes |
| U+2069 | POP DIRECTIONAL ISOLATE | yes | yes |

## Example

```sjs
// ✗ error — BiDi codepoint inside identifier (rejected in all modes)
const café‮ = "coffee shop"
//       ^^^ U+202E inside identifier
// SJS-L011  error  1:10  BiDi codepoint U+202E inside identifier — always rejected

// ✗ error — BiDi codepoint in string literal, --strict-bidi active
const s = "Hello ‮ world"
//               ^^^ U+202E
// SJS-L011  error  3:17  BiDi codepoint U+202E in string literal; rejected by --strict-bidi
```

## Fix

Remove the BiDi codepoints from the source. For identifiers, rename the variable using only
standard Unicode identifier characters:

```sjs
// ✓ correct — identifier without BiDi codepoints
const cafe = "coffee shop"
```

If a BiDi codepoint is intentionally needed in a string literal value (e.g. test data for a
BiDi rendering engine), use a Unicode escape sequence so the character is visible in source
review and does not trigger SJS-L011 even in `--strict-bidi` mode:

```sjs
// ✓ correct — explicit Unicode escape; intent is unambiguous
const rtlOverride = "‮"
```

## Configuration

| Trigger condition | Code emitted |
|---|---|
| BiDi codepoint in identifier (any mode) | SJS-L011 (error, not suppressible) |
| BiDi codepoint outside identifier, `--strict-bidi` active | SJS-L011 (error) |
| BiDi codepoint outside identifier, default mode | SJS-W012 (warning) |

SJS-L011 inside identifiers cannot be suppressed by configuration. The prohibition on BiDi
characters in identifiers is a hard safety invariant of the SJS language spec.

## Related codes

- `SJS-W012` — BiDi codepoint in source file (warning in default mode; the non-strict
  counterpart to SJS-L011)
