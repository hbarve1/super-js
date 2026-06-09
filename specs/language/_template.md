# NNN — Feature Name

**Status:** Stage X — [planned | in progress | implemented]  
**Grammar:** `spec/grammar.ebnf` §NNN

## Syntax

```ebnf
(* EBNF excerpt from spec/grammar.ebnf *)
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

## Diagnostic codes

| Code | When emitted |
|---|---|
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
