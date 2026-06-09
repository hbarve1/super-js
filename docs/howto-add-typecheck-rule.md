# HOWTO: Add a New Type-Checker Rule

This guide covers how to add a new type-checking rule to SuperJS — from identifying where the rule lives, through defining the condition, to making it configurable.

---

## Where rules live

SuperJS has two type-checker implementations that must stay in sync:

| Implementation | File | Language |
|---|---|---|
| Prototype (Phase 1, production) | `backends/prototype/src/typeChecker/index.ts` | TypeScript + Babel |
| Compiler (Phase 2, correctness check) | `compiler/src/type-checker/type-checker.js` | Plain JavaScript |

**Always implement the rule in the prototype first.** The plain-JS compiler is less complete and mirrors the prototype. See `backends/prototype/CLAUDE.md` and `compiler/CLAUDE.md` for per-package details.

---

## Types of rules

| Type | Example codes | Where configured |
|---|---|---|
| Type errors | SJS-E001–E019 | Always on; cannot be disabled |
| Warnings | SJS-W001–W010 | Some are `--strict` only |
| Lint rules | SJS-L001–L005 | Configurable in `superjs.config.json` |

This guide covers **type-checker rules** (type errors and warnings). For lint rules (which run as a separate pass in `backends/prototype/src/linter/index.ts`), the process is similar but the file is different.

---

## Step 1 — Define the rule

Answer these questions before writing code:

1. **What condition should be flagged?** Be precise — name the AST node type(s) involved, the type mismatch or invariant violation.
2. **What is the diagnostic code?** If you need a new code, follow `docs/howto-add-diagnostic.md` first to reserve it in `specs/error-codes.md`.
3. **What severity?** `error` blocks compilation; `warning` does not (unless `--strict`).
4. **Is it always on, or `--strict` only?** Warnings that are noisy for loose code should be gated on `this.strictMode`.

---

## Step 2 — Find the right check method in the prototype

Open `backends/prototype/src/typeChecker/index.ts`. The file is large (~4300 lines) but organized around Babel AST node types. Search for the node type you need:

```
# Example searches
grep -n "checkVariableDeclarator\|VariableDeclarator" src/typeChecker/index.ts
grep -n "FunctionDeclaration\|checkFunction" src/typeChecker/index.ts
grep -n "AssignmentExpression" src/typeChecker/index.ts
```

The main dispatcher is the `check(path: NodePath)` method. Each node type maps to a private `check*` method.

---

## Step 3 — Implement the check

### 3a — Add a private method

```ts
// ── Rule SJS-EXXX: description ──────────────────────────────────────────────

private checkMyRule(path: NodePath<t.SomeNode>): void {
  const node = path.node

  // 1. Infer the relevant types using inferExprType() or resolveType()
  const exprType = inferExprType(node.someExpression, this.env)

  // 2. Test the condition
  if (exprType.kind !== 'number') {
    // 3. Report the diagnostic
    this.report({
      code: 'SJS-EXXX',
      severity: 'error',
      message: `Cannot use a '${exprType.kind}' value here; expected 'number'.`,
      node,
      specUrl: 'https://tc39.es/ecma262/#sec-relevant-section',
    })
  }
}
```

**Type inference helpers available in `index.ts`:**

- `inferExprType(node, this.env)` — synthesizes the Type of an expression (bottom-up)
- `resolveType(tsTypeNode)` — converts a Babel TSType annotation to our internal `Type`
- `makeUnion(a, b)` — builds the smallest union of two types
- `isNullableType(tp)` — true if the type includes `null` or `undefined`

**The `Type` union** is defined in `src/typeChecker/types.ts`. Kinds include: `'number'`, `'string'`, `'boolean'`, `'null'`, `'undefined'`, `'void'`, `'any'`, `'dynamic'`, `'array'`, `'object'`, `'function'`, `'union'`, `'tuple'`, `'generator'`, `'promise'`, `'symbol'`, `'bigint'`, `'never'`, `'typeParam'`, `'intersection'`.

### 3b — Wire into the dispatcher

In the main `check(path)` method, add a case for your node type:

```ts
check(path: NodePath): void {
  switch (path.type) {
    // ... existing cases ...
    case 'SomeNode':
      this.checkMyRule(path as NodePath<t.SomeNode>)
      break
  }
}
```

### 3c — Strict-mode gating (for warnings)

If the diagnostic should only fire in `--strict` mode:

```ts
private checkMyRule(path: NodePath<t.SomeNode>): void {
  if (!this.strictMode) return   // skip unless --strict
  // ... rest of the check
}
```

`this.strictMode` is set from the CLI flag `--strict` when the compiler is invoked.

---

## Step 4 — Test pattern

Create or add to a test file in `backends/prototype/tests/typeChecker/`. Every rule needs at minimum:

1. A test that **confirms the diagnostic fires** for a violation
2. A test that **confirms no diagnostic fires** for valid code
3. A test that checks the **diagnostic code string** matches exactly

```ts
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import { TypeChecker } from '../../src/typeChecker'
import type { PrototypeDiagnostic } from '../../src/typeChecker/types'

function typeCheck(source: string, strict = false): PrototypeDiagnostic[] {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
  const checker = new TypeChecker({ strict })
  traverse(ast, { enter(path) { checker.check(path) } })
  return checker.getDiagnostics()
}

function errors(source: string): PrototypeDiagnostic[] {
  return typeCheck(source).filter(d => d.severity === 'error')
}

function warnings(source: string, strict = false): PrototypeDiagnostic[] {
  return typeCheck(source, strict).filter(d => d.severity === 'warning')
}

describe('SJS-EXXX: rule name', () => {
  it('emits SJS-EXXX for the violation', () => {
    const diags = errors(`const x: number = "wrong"`)
    expect(diags.some(d => d.code === 'SJS-EXXX')).toBe(true)
  })

  it('accepts valid code', () => {
    expect(errors(`const x: number = 42`)).toHaveLength(0)
  })

  // For strict-mode-only warnings:
  it('does not fire in non-strict mode', () => {
    expect(warnings(`let x = maybeAnything`, false)).toHaveLength(0)
  })

  it('fires in strict mode', () => {
    const diags = warnings(`let x = maybeAnything`, true)
    expect(diags.some(d => d.code === 'SJS-WXXX')).toBe(true)
  })
})
```

Run `npm test` from `backends/prototype/` to confirm all tests pass.

---

## Step 5 — Make it configurable in `superjs.config.json`

Lint rules (`SJS-L001`–`SJS-L005`) and some warnings can be configured by users. If your rule should be configurable:

### 5a — Add to the config schema

Open `specs/config-schema.json`. Under the `lint.rules` section, add your rule key:

```json
"lint": {
  "type": "object",
  "properties": {
    "rules": {
      "type": "object",
      "properties": {
        "your-rule-name": {
          "type": "string",
          "enum": ["off", "warn", "error"],
          "default": "warn",
          "description": "SJS-LXXX: description of your rule"
        }
      }
    }
  }
}
```

### 5b — Read the config in the linter/type-checker

For lint rules, the linter in `backends/prototype/src/linter/index.ts` reads rule configuration from the parsed `superjs.config.json`. Add your rule's config key there and use it to gate the emission:

```ts
const ruleLevel = config?.lint?.rules?.['your-rule-name'] ?? 'warn'
if (ruleLevel === 'off') return
const severity = ruleLevel === 'error' ? 'error' : 'warning'
```

For type-checker warnings, the TypeChecker constructor already accepts a `strict` flag. Rules that should only run in strict mode are gated on `this.strictMode` as shown in Step 3c.

---

## Checklist

Before opening a PR:

- [ ] Diagnostic code reserved in `specs/error-codes.md`
- [ ] Spec file at `specs/error-codes/SJS-EXXX.md` created
- [ ] Rule implemented in `backends/prototype/src/typeChecker/index.ts`
- [ ] If configurable: `specs/config-schema.json` updated
- [ ] Tests written covering violation, valid form, and edge cases
- [ ] `npm test` passes in `backends/prototype/`
- [ ] Rule mirrored (or TODO added) in `compiler/src/type-checker/type-checker.js`
- [ ] `specs/language/060-error-codes-map.md` updated
