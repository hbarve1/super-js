# HOWTO: Add a New SJS Diagnostic Code

This guide walks you through adding a brand-new diagnostic code (e.g., `SJS-E020`) end-to-end, from reserving the number to merging a PR. Follow every step in order.

---

## 1. Check the next available code number

Open `specs/error-codes.md` and find the highest existing number in the category you need:

| Category | Letter | Current highest (as of this writing) |
|---|---|---|
| Type errors | `E` | SJS-E019 |
| Warnings | `W` | SJS-W010 |
| Lint | `L` | SJS-L005 |
| Parser | `P` | SJS-P005, SJS-P099 |

Pick the next number. **Do not skip numbers.** If `SJS-E019` is the highest, your new code is `SJS-E020`.

If two people are adding codes simultaneously, coordinate in your PR to avoid collisions.

---

## 2. Add the code to `specs/error-codes.md`

Open `specs/error-codes.md` and insert a new row in the correct table. Example for a type-error code:

```markdown
| SJS-E020 | error | type-check | Your short message here | Stage 1 |
```

Fill in all five columns: code, severity, category, short message, owning stage. The short message should be brief (under 80 chars) and match the `message` string you'll emit in code.

---

## 3. Create `specs/error-codes/SJS-E020.md`

Create a new file at `specs/error-codes/SJS-E020.md`. Model it on an existing file such as `specs/error-codes/SJS-E001.md`:

```markdown
# SJS-E020 — Short description matching the registry entry

**Severity:** error
**Category:** type-check
**Stage:** Stage 1

## Description

One to three sentences explaining what this error means and why it is an error in SJS.
Reference the relevant ECMA-262 section if applicable.

## Example

```sjs
// ✗ error
let bad: number = someInvalidThing  // SJS-E020
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

## 5. Emit the code in the prototype (`backends/prototype/`)

The prototype in `backends/prototype/src/typeChecker/index.ts` is where all type-checking rules live. Add your emission there.

### Find the right location

The `TypeChecker.check(path)` method dispatches on `path.type`. Find the relevant AST node type for your rule. Examples:

- Variable declarations: look for `checkVariableDeclarator`
- Function return types: look for `checkFunctionDeclaration`
- Assignment expressions: look for `AssignmentExpression` handling
- Member access: look for `MemberExpression` handling

### Add the `this.report(...)` call

```ts
this.report({
  code: 'SJS-E020',
  severity: 'error',
  message: `Clear human-readable explanation. Mention the type/value involved.`,
  node: path.node,          // the offending AST node (for location)
  specUrl: 'https://tc39.es/ecma262/#relevant-section',
})
```

The `specUrl` should point to the ECMA-262 section that defines the constraint, or to the SJS spec file in `specs/` if it's a SJS-specific rule.

### Wire into the visitor

If you added a new private method, make sure it is called from the main `check(path)` dispatcher or from another method that is already called for the relevant path type.

---

## 6. Write a test (golden file pattern — prototype)

Create or add to a test file under `backends/prototype/tests/typeChecker/`. Use the standard helper pattern:

```ts
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import { TypeChecker } from '../../src/typeChecker'
import type { PrototypeDiagnostic } from '../../src/typeChecker/types'

function typeCheck(source: string): PrototypeDiagnostic[] {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
  const checker = new TypeChecker()
  traverse(ast, { enter(path) { checker.check(path) } })
  return checker.getDiagnostics()
}

function errors(source: string): PrototypeDiagnostic[] {
  return typeCheck(source).filter(d => d.severity === 'error')
}

describe('SJS-E020: your rule description', () => {
  it('emits SJS-E020 for the violation', () => {
    const diags = errors(`
      // SJS source that triggers your rule
    `)
    expect(diags.some(d => d.code === 'SJS-E020')).toBe(true)
  })

  it('does not emit SJS-E020 for valid code', () => {
    const diags = errors(`
      // SJS source that is valid
    `)
    expect(diags.some(d => d.code === 'SJS-E020')).toBe(false)
  })

  it('includes a useful message', () => {
    const diags = errors(`/* violating source */`)
    const d = diags.find(d => d.code === 'SJS-E020')
    expect(d?.message).toContain('some key phrase from your message')
  })
})
```

Run the tests from `backends/prototype/`:

```bash
npm test
```

Confirm all tests pass before proceeding.

---

## 7. Mirror the code in `compiler/` (Phase 2)

The plain-JS compiler at `compiler/src/type-checker/type-checker.js` needs to emit the same code for the same input. The compiler is less complete than the prototype, so it may not yet parse the construct your rule targets. Either:

- Add the check if the compiler's parser already handles the relevant node type, OR
- Add a `// TODO SJS-E020: mirror from prototype` comment near the relevant section

The compiler tests use a different pattern (throw-on-error, not collect). See `compiler/CLAUDE.md` for the exact pattern.

---

## PR checklist

Before opening a PR for a new diagnostic code:

- [ ] `specs/error-codes.md` — new row added in the correct table
- [ ] `specs/error-codes/SJS-E020.md` — spec file created with description, example, fix, related codes
- [ ] `specs/language/060-error-codes-map.md` — mapping added
- [ ] `backends/prototype/src/typeChecker/index.ts` — `this.report(...)` call added
- [ ] `backends/prototype/tests/typeChecker/` — test covering violation and valid form
- [ ] `npm test` passes in `backends/prototype/` with zero failures
- [ ] PR description references the owning stage and the issue/ticket motivating the diagnostic
- [ ] No existing code number reused (double-check the Retired Codes section too)
