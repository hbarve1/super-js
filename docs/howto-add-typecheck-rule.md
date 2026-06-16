# HOWTO: Add a New Type-Checker Rule

This guide covers how to add a new type-checking rule to SuperJS — from identifying where the rule lives, through defining the condition, to making it configurable.

> **Adding a brand-new diagnostic code?** Do that first. `docs/howto-add-diagnostic.md` covers reserving the code in the diagnostics registry and writing its spec file. This guide assumes the code exists and focuses on the **type-checker rule logic** — where to put the condition in `checker.ts`, how `synth`/`check` work, and how to test it.

---

## Where rules live

The compiler is a hand-written pipeline of NX libraries under `superjs/`: lexer → parser → checker → ir → codegen-js. There is **one** type checker (no Babel, no separate plain-JS backend):

| Concern | File |
|---|---|
| The checker | `superjs/libs/checker/src/lib/checker.ts` |
| Type constructors / singletons / `display()` | `superjs/libs/checker/src/lib/model.ts` |
| Assignability (`isAssignable`) | `superjs/libs/checker/src/lib/subtype.ts` |
| `TypeNode` → `Type` resolution (`resolveType`) | `superjs/libs/checker/src/lib/resolve.ts` |
| Lexical scope | `superjs/libs/checker/src/lib/scope.ts` |
| Diagnostic registry (codes, templates, severity) | `superjs/libs/diagnostics/src/lib/registry.ts` |

`checker.ts` is a single `Checker` class that runs **two passes** over the AST produced by `@superjs/parser`: first `collectTypes` (gather named types, sums, classes), then a check pass over statements and expressions. It is **bidirectional**:

- `synth(expr): Type` — synthesize (infer) a type bottom-up. Dispatches on `expr.kind` in `synthInner`, with per-node helpers like `synthBinary`, `synthArray`, `synthIdentifier`.
- `check(expr, expected): Type` — check an expression against an expected type (contextual typing). Falls back to `synth` for kinds that don't benefit from context.

Diagnostics are emitted through a `DiagnosticBag` (`this.bag`), never with inline message strings.

---

## Types of rules

| Type | Code prefix | Where configured |
|---|---|---|
| Type errors | `SJS-E*` | Always on; cannot be disabled |
| Warnings | `SJS-W*` | May be promoted to errors under strict mode |
| Lint rules | `SJS-L*` | Configurable via `superjs.config.json` |

All three live in the **same** registry (`registry.ts`) and are emitted through the same `DiagnosticBag`. Whether a given diagnostic is configurable or gets promoted to an error is governed by config (`superjs/libs/config`) plus the bag's strict-promotion behavior — not by living in a different file.

This guide covers type-checker rules (errors and warnings). Lint rules follow the same emit pattern; the difference is in how they're configured (see Step 4).

---

## Step 1 — Define the rule

Answer these before writing code:

1. **What condition should be flagged?** Name the AST node kind(s) involved and the exact type mismatch or invariant violation.
2. **What is the diagnostic code?** If you need a new one, follow `docs/howto-add-diagnostic.md` first to register it. The message *template* (with `{token}` placeholders) lives in the registry — the emit site only supplies `params`.
3. **What severity?** `error` blocks compilation; `warning` does not (unless strict mode promotes it).

---

## Step 2 — Find the right place in `checker.ts`

Open `superjs/libs/checker/src/lib/checker.ts`. The class is organized around the AST node kinds from `@superjs/parser`/`@superjs/types`. Find the method that already handles the construct you care about:

- Statements dispatch through `checkStatement`, which switches on `s.kind` and delegates to helpers (`checkVarDecl`, `checkFunctionDecl`, `checkClassDecl`, `checkReturn`, `checkIf`, …).
- Expressions dispatch through `synthInner` (which `synth` calls) and the contextual `check(expr, expected)`. Per-node helpers are named `synth*` (e.g. `synthBinary`, `synthCall`, `synthIdentifier`).

```
# Example searches
grep -n "VariableDecl\|checkVarDecl" libs/checker/src/lib/checker.ts
grep -n "FunctionDecl\|checkFunctionDecl" libs/checker/src/lib/checker.ts
grep -n "synthBinary\|BinaryExpression" libs/checker/src/lib/checker.ts
```

If your rule is about how a value flows into a typed position (assignment, return, argument), the assignability path is `checkAssignable(actual, expected, span)`, which calls `isAssignable` and reports `SJS-E001` (nullishness) or `SJS-E002` (general mismatch). Reuse it rather than re-implementing assignability.

---

## Step 3 — Implement the check

### 3a — Compute the relevant type(s)

Inside the method handling that AST node kind, get the types you need:

```ts
// Infer an expression's type bottom-up:
const exprType = this.synth(node.someExpression);

// Or check it against an expected type (contextual):
this.check(node.someExpression, expectedType);

// Convert a TypeNode annotation to an internal Type:
const annotated = resolveType(node.typeAnnotation, this);
```

Type constructors, singletons (`NUMBER`, `STRING`, `NULL`, `DYNAMIC`, …), and `display()` come from `model.ts`. Use `isAssignable(source, target)` from `subtype.ts` to test compatibility.

### 3b — Test the condition and report

Emit through `this.bag.report`. The code comes from the generated `Codes` constants; the human-readable message is the registry template, interpolated from `params`:

```ts
if (!isAssignable(exprType, NUMBER)) {
  this.bag.report({
    code: Codes['E0XX'],
    span: node.span,
    params: { expected: display(NUMBER), found: display(exprType) },
  });
}
```

The `params` keys must match the `{token}` placeholders in that code's template in `registry.ts`. If the template has no placeholders, omit `params` entirely. `checker.ts` also has thin private wrappers (`error`, `warn`, `lint`) over `this.bag.report` for codes that take no params or a simple `type` param — follow the existing convention in the file.

### 3c — Severity and strict mode

Severity is fixed by the descriptor in `registry.ts` (the `d(severity, …)` entry), not at the emit site. A `warning` is automatically promoted to an `error` by the `DiagnosticBag` when the checker runs in strict mode (`new Checker({ strict: true })`, threaded from config). So to make a check "strict-only error," register it as a warning and rely on promotion — you generally do **not** branch on a strict flag inside the rule.

---

## Step 4 — Test the rule

Tests are colocated Vitest specs: `superjs/libs/checker/src/lib/checker.spec.ts`. The spec drives the public `check(source)` entry point from `@superjs/checker` and inspects `result.diagnostics`. Existing helpers in the spec wrap this (`codes(src)`, `clean(src)`, `has(src, code)`); the `@superjs/test-utils` lib also provides matchers like `codesOf(diags)`, `hasCode(diags, code)`, and `errorsOf(diags)`.

Every rule needs at minimum: a test that the diagnostic **fires** on a violation, and one that valid code stays **clean**.

```ts
import { describe, it, expect } from 'vitest';
import { check } from '../index.js';

function codes(src: string): string[] {
  return check(src).diagnostics.map((d) => d.code);
}

describe('SJS-E0XX: rule name', () => {
  it('emits SJS-E0XX for the violation', () => {
    expect(codes('let x: number = "wrong";')).toContain('SJS-E0XX');
  });

  it('accepts valid code', () => {
    expect(check('let x: number = 42;').diagnostics).toHaveLength(0);
  });
});
```

For a warning that should become an error under strict mode, pass the option through `check`:

```ts
it('is a warning by default but an error under strict', () => {
  const loose = check('/* triggering source */');
  expect(loose.diagnostics.some((d) => d.severity === 'error')).toBe(false);

  const strict = check('/* same source */', { strict: true });
  expect(strict.diagnostics.some((d) => d.severity === 'error')).toBe(true);
});
```

Run the checker tests:

```
cd superjs && pnpm nx test @superjs/checker
```

---

## Step 5 — Make a lint rule configurable

Type errors are always on. Lint rules (`SJS-L*`) — and warnings you want users to silence or promote — are configured through `superjs.config.json`, loaded and validated by `superjs/libs/config`.

If your rule should be user-configurable, add its key to the config schema (`specs/config-schema.json`, under the lint section) following `docs/howto-add-diagnostic.md`, then gate the rule on the resolved config level. The `DiagnosticBag`'s strict-promotion handles warning→error escalation; per-rule `off`/`warn`/`error` overrides come from config.

---

## Step 6 — Run all checks before opening a PR

```
cd superjs && pnpm nx run-many -t lint test typecheck build
```

### Checklist

- [ ] Diagnostic code registered in `superjs/libs/diagnostics/src/lib/registry.ts` and spec'd per `docs/howto-add-diagnostic.md`
- [ ] Rule implemented in `superjs/libs/checker/src/lib/checker.ts`, emitting via `this.bag.report({ code: Codes[...], span, params })`
- [ ] Tests in `superjs/libs/checker/src/lib/checker.spec.ts` cover the violation and the clean case (and strict promotion, if applicable)
- [ ] If configurable: `specs/config-schema.json` updated and the rule reads its level from config
- [ ] `pnpm nx run-many -t lint test typecheck build` passes
