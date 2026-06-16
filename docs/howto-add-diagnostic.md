# HOWTO: Add a New SJS Diagnostic Code

This guide walks you through adding a brand-new diagnostic code (e.g., `SJS-E021`) end-to-end, from reserving the number to merging a PR. Follow every step in order.

> The compiler lives in the NX monorepo under `superjs/`. Diagnostics are defined
> in `libs/diagnostics` and emitted by the type checker in `libs/checker`.

---

## 1. Check the next available code number

Open `specs/error-codes.md` and find the highest existing number in the category you need:

| Category | Letter | Current highest (as of this writing) |
|---|---|---|
| Type errors | `E` | SJS-E020 |
| Warnings | `W` | SJS-W012 |
| Lint | `L` | SJS-L011 |
| Parser | `P` | SJS-P005, SJS-P099 |

The canonical list is the `TABLE` in `superjs/libs/diagnostics/src/lib/registry.ts`
(mirrored by `specs/error-codes.md`). Pick the next number. **Do not skip
numbers.** If `SJS-E020` is the highest, your new code is `SJS-E021`.

If two people are adding codes simultaneously, coordinate in your PR to avoid collisions.

---

## 2. Add the code to `specs/error-codes.md`

Open `specs/error-codes.md` and insert a new row in the correct table. Example for a type-error code:

```markdown
| SJS-E021 | error | type-check | Your short message here | Stage 1 |
```

Fill in all five columns: code, severity, category, short message, owning stage. The short message should be brief (under 80 chars) and match the `message` string you'll emit in code.

---

## 3. Create `specs/error-codes/SJS-E021.md`

Create a new file at `specs/error-codes/SJS-E021.md`. Model it on an existing file such as `specs/error-codes/SJS-E001.md`:

```markdown
# SJS-E021 — Short description matching the registry entry

**Severity:** error
**Category:** type-check
**Stage:** Stage 1

## Description

One to three sentences explaining what this error means and why it is an error in SJS.
Reference the relevant ECMA-262 section if applicable.

## Example

```sjs
// ✗ error
let bad: number = someInvalidThing  // SJS-E021
```

## Fix

```sjs
// ✓ correct
let good: number = 42
```

## Related codes

- `SJS-EXXX` — related diagnostic
- `SJS-EYYY` — another related diagnostic
```

---

## 4. Add to `specs/language/060-error-codes-map.md`

Open `specs/language/060-error-codes-map.md` and add an entry that maps the language feature or condition to the new code. This file is the cross-reference between language features and their diagnostics.

---

## 5. Register the code in `@superjs/diagnostics`

The registry is the single source of truth for `code → severity, category,
template, stage`. Open `superjs/libs/diagnostics/src/lib/registry.ts` and add a
row to the `TABLE`, in the correct category block:

```ts
'SJS-E021': d('error', 'type-check', 'Your short message; `{token}` slots are filled at emit time', 'Stage 1'),
```

The `d(...)` helper is `defineCode(severity, category, template, stage)`. The
`template` may contain `{name}` tokens — they are interpolated by
`formatMessage` from the `params` you pass when emitting. Use a `category` that
already exists in the union (e.g. `null-safety`, `type-check`, `match`,
`classes`, `modules`). The `Codes` constant for your code is generated from the
table key automatically.

---

## 6. Emit the code from the type checker

The checker lives in `superjs/libs/checker/src/lib/checker.ts`. It is a
bidirectional checker (`synth`/`check`) that walks the parsed AST; diagnostics
are collected in a `DiagnosticBag`. Find the method that handles the relevant
construct (e.g. variable declarations, assignments, member access, match arms)
and emit via the bag:

```ts
this.bag.report({
  code: Codes['E021'],
  span,                                  // the offending node's Span (for location)
  params: { type: display(found) },      // fills {type} in the template — omit if none
});
```

`span` comes from the AST node you are checking (every node carries a `Span`).
The pretty-printer and JSON formatter both render the message from the registry
template + your `params`, so the message text lives in the registry, not here.

---

## 7. Write a test

Checker tests are colocated and run with Vitest:
`superjs/libs/checker/src/lib/checker.spec.ts`. Add cases asserting the code
fires on the violation and is absent on valid code. The suite uses a small
helper that runs the real checker and returns its diagnostics:

```ts
import { describe, it, expect } from 'vitest';
import { codesOf } from '@superjs/test-utils';
import { check } from './checker';   // or the suite's existing check helper

describe('SJS-E021: your rule description', () => {
  it('emits SJS-E021 for the violation', () => {
    const diags = check(`/* SJS source that triggers your rule */`);
    expect(codesOf(diags)).toContain('SJS-E021');
  });

  it('does not emit SJS-E021 for valid code', () => {
    const diags = check(`/* valid SJS source */`);
    expect(codesOf(diags)).not.toContain('SJS-E021');
  });
});
```

Run it from the workspace:

```bash
cd superjs
pnpm nx test @superjs/checker
```

For an end-to-end assertion (source → compiled), add a fixture under
`superjs/apps/e2e/fixtures/` and a case in the matching `*.spec.ts`.

---

## PR checklist

Before opening a PR for a new diagnostic code:

- [ ] `specs/error-codes.md` — new row added in the correct table
- [ ] `specs/error-codes/SJS-E021.md` — spec file created with description, example, fix, related codes
- [ ] `specs/language/060-error-codes-map.md` — mapping added
- [ ] `superjs/libs/diagnostics/src/lib/registry.ts` — `TABLE` entry added
- [ ] `superjs/libs/checker/src/lib/checker.ts` — `this.bag.report(...)` call added
- [ ] `superjs/libs/checker/src/lib/checker.spec.ts` — test covering violation and valid form
- [ ] `pnpm nx run-many -t test lint typecheck` passes with zero failures
- [ ] PR description references the owning stage and the issue/ticket motivating the diagnostic
- [ ] No existing code number reused (double-check the Retired Codes section too)
