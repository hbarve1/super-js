# NNN — Feature Name

**Status:** Stage X — [planned | in progress | implemented]  
**Grammar:** `specs/grammar.ebnf` §NNN

## Syntax

```ebnf
(* EBNF excerpt from specs/grammar.ebnf *)
```

## Semantics

Normative prose describing the semantics of this feature.

## Type rules

Describe inference and checking rules. Use the notation:

```
Γ ⊢ expr : T
───────────────── (rule-name)
Γ ⊢ usage : T'
```

## JS Lowering (Prototype)

How the Babel-based prototype compiler transforms this construct into output JS.
Include:
- Input SJS pattern
- Output JS pattern
- Any helper functions emitted
- Edge cases

```sjs
// SJS input

// JS output
```

## LLVM Lowering (Future)

How this construct maps to LLVM IR. Fill in when LLVM backend reaches this feature.
Include:
- Value representation (types, struct layouts)
- Instructions emitted
- Calling convention notes

```llvm
; LLVM IR sketch
```

## Diagnostic codes

| Code | When emitted |
|------|-------------|
| `SJS-EXXX` | Condition that triggers this code |

## Examples

### Valid

```sjs
// ✓ description
```

### Invalid

```sjs
// ✗ SJS-EXXX: description
```
