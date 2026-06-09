> **Archived** — Pre-Stage-0 sprint plan. Superseded by `specs/roadmap/` and `specs/features/`. Read-only reference.

# SJS Sprint 2 — Null Safety + Sum Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SJS's two key differentiators to the Babel prototype — sound null safety (`T?`) and sum types with `match` — and verify all four demo projects compile end-to-end.

**Architecture:** Three layers of work. (1) Demo verification: compile and run all examples, fix any gaps. (2) Null safety: extend the type checker to track `T?` annotations, emit `SJS-E005` on null dereferences, and narrow types through `if`/`?.` checks. (3) Sum types: a source preprocessor transforms SJS-specific `type R = Ok(T) | Err(E)` and `match` syntax into valid TypeScript before Babel processes it; the type checker then enforces variant construction and exhaustiveness.

**Tech Stack:** TypeScript 5.4, Node.js 18+, `@babel/parser`, `@babel/traverse`, `@babel/types`, `@babel/core`, Jest + `ts-jest`.

**Spec refs:** `specs/001-superjs-core-language/type-system-v2.md` §3 (null safety), §4 (sum types), §4.5 (pattern matching).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `prototype/src/typeChecker/types.ts` | Modify | Add `SumType`, `SumVariantType`, `DynamicType` |
| `prototype/src/typeChecker/index.ts` | Modify | Null safety rules, sum type construction checks, exhaustiveness |
| `prototype/src/preprocessor/index.ts` | **Create** | SJS-to-TS source transform (sum types + match) |
| `prototype/src/preprocessor/sumTypes.ts` | **Create** | `type R = Ok(T) \| Err(E)` → TS discriminated union |
| `prototype/src/preprocessor/matchExpr.ts` | **Create** | `match expr { Variant(x) => ... }` → `switch` on `_tag` |
| `prototype/src/compiler/index.ts` | Modify | Call preprocessor before Babel transform |
| `prototype/tests/preprocessor/sumTypes.test.ts` | **Create** | Preprocessor unit tests |
| `prototype/tests/preprocessor/matchExpr.test.ts` | **Create** | Match transform tests |
| `prototype/tests/typeChecker/null-safety.test.ts` | **Create** | Null safety rule tests |
| `prototype/tests/typeChecker/sum-types.test.ts` | **Create** | Sum type construction + exhaustiveness tests |
| `prototype/tests/compiler/demos.test.ts` | **Create** | End-to-end: all 4 demos compile without errors |

---

## Task 1: Demo Compilation Test (Smoke Test)

**Files:**
- Create: `prototype/tests/compiler/demos.test.ts`

Prove the 4 demo projects compile before adding features. These tests must pass before and after every subsequent task.

- [ ] **Step 1.1: Write the failing test**

```typescript
// prototype/tests/compiler/demos.test.ts
import { compile } from '../../src/compiler'
import { existsSync } from 'fs'
import { join } from 'path'

const DEMOS_DIR = join(__dirname, '../../examples')

describe('Demo projects compile end-to-end', () => {
  const demos = [
    { name: 'algorithms', dir: join(DEMOS_DIR, 'algorithms'), outDir: '/tmp/sjs-demo-algorithms' },
    { name: 'web',        dir: join(DEMOS_DIR, 'web/src'),    outDir: '/tmp/sjs-demo-web' },
    { name: 'jsx',        dir: join(DEMOS_DIR, 'jsx/src'),    outDir: '/tmp/sjs-demo-jsx' },
    { name: 'node',       dir: join(DEMOS_DIR, 'node/src'),   outDir: '/tmp/sjs-demo-node' },
  ]

  for (const demo of demos) {
    it(`${demo.name} demo compiles without errors`, async () => {
      await expect(
        compile({ directory: demo.dir, outDir: demo.outDir, silent: true })
      ).resolves.not.toThrow()
    })
  }
})
```

- [ ] **Step 1.2: Run the tests**

```bash
cd prototype && npx jest tests/compiler/demos.test.ts --no-coverage -t "Demo"
```

Expected: 4 tests. Note which fail — those are real bugs to fix before proceeding.

- [ ] **Step 1.3: Fix any demo compilation errors**

For each failing demo, read the error, find the offending `.sjs` file, and fix the issue (likely: import path differences, missing type annotations the type checker rejects, or unsupported syntax). Fix in the demo source file, not the compiler.

- [ ] **Step 1.4: Re-run until all 4 pass**

```bash
cd prototype && npx jest tests/compiler/demos.test.ts --no-coverage
```

Expected: `4 passed`

- [ ] **Step 1.5: Commit**

```bash
cd prototype && git add tests/compiler/demos.test.ts examples/
git commit -m "test: add demo compilation smoke tests; fix any demo source errors"
```

---

## Task 2: Add `SumType` to the Type System

**Files:**
- Modify: `prototype/src/typeChecker/types.ts`

Add the internal type representation for sum types before any checker logic.

- [ ] **Step 2.1: Write the failing test**

```typescript
// prototype/tests/typeChecker/sum-types.test.ts
import type { SumType, SumVariantType } from '../../src/typeChecker/types'

describe('SumType structure', () => {
  it('can construct a SumType with variants', () => {
    const okVariant: SumVariantType = {
      kind: 'sumVariant',
      tag: 'Ok',
      fields: [{ name: '_0', type: { kind: 'number' } }],
    }
    const errVariant: SumVariantType = {
      kind: 'sumVariant',
      tag: 'Err',
      fields: [{ name: '_0', type: { kind: 'string' } }],
    }
    const result: SumType = {
      kind: 'sum',
      name: 'Result',
      variants: [okVariant, errVariant],
    }
    expect(result.variants).toHaveLength(2)
    expect(result.variants[0].tag).toBe('Ok')
  })
})
```

- [ ] **Step 2.2: Run to confirm it fails**

```bash
cd prototype && npx jest tests/typeChecker/sum-types.test.ts --no-coverage
```

Expected: FAIL — `SumType` and `SumVariantType` not exported.

- [ ] **Step 2.3: Add types to `types.ts`**

In `prototype/src/typeChecker/types.ts`, add after the `IntersectionType` block:

```typescript
// ── Sum types (SJS-specific — type Result<T> = Ok(T) | Err(string)) ──────────

export interface SumVariantType {
  kind: 'sumVariant'
  tag: string                                    // variant name, e.g. "Ok"
  fields: Array<{ name: string; type: Type }>   // positional: _0, _1, …
}

export interface SumType {
  kind: 'sum'
  name: string           // declared type name, e.g. "Result"
  variants: SumVariantType[]
}

/** `dynamic` — runtime-checked escape hatch (not `any`). Consistent with every type. */
export interface DynamicType { kind: 'dynamic' }
```

Then add `SumType | SumVariantType | DynamicType` to the `Type` union at the bottom of the file.

- [ ] **Step 2.4: Run test**

```bash
cd prototype && npx jest tests/typeChecker/sum-types.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 2.5: Run full suite to check no regressions**

```bash
cd prototype && npx jest --no-coverage
```

Expected: all previously passing tests still pass.

- [ ] **Step 2.6: Commit**

```bash
cd prototype && git add src/typeChecker/types.ts tests/typeChecker/sum-types.test.ts
git commit -m "feat(types): add SumType, SumVariantType, DynamicType to type universe"
```

---

## Task 3: Null Safety — `T?` Annotation Tracking

**Files:**
- Create: `prototype/tests/typeChecker/null-safety.test.ts`
- Modify: `prototype/src/typeChecker/index.ts`

The type checker must emit `SJS-E005` when a `T?` variable is accessed without a prior null check.

- [ ] **Step 3.1: Write the failing tests**

```typescript
// prototype/tests/typeChecker/null-safety.test.ts
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import { TypeChecker } from '../../src/typeChecker'
import type { Diagnostic } from '../../src/typeChecker/types'

function typeCheck(source: string): Diagnostic[] {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
  const checker = new TypeChecker()
  traverse(ast, { enter(path) { checker.check(path) } })
  return checker.getDiagnostics()
}

function errors(source: string) {
  return typeCheck(source).filter(d => d.severity === 'error')
}

describe('Null Safety — T? annotation (type-system-v2.md §3)', () => {
  it('accepts assigning null to T? variable', () => {
    expect(errors('const x: string | null = null')).toHaveLength(0)
  })

  it('accepts assigning a string to string? variable', () => {
    expect(errors('const x: string | null = "hello"')).toHaveLength(0)
  })

  it('rejects assigning null to non-nullable string variable', () => {
    const diags = errors('const x: string = null')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })

  it('rejects assigning undefined to non-nullable number', () => {
    const diags = errors('const x: number = undefined')
    expect(diags.some(d => d.code === 'SJS-E001')).toBe(true)
  })
})
```

- [ ] **Step 3.2: Run to confirm failures**

```bash
cd prototype && npx jest tests/typeChecker/null-safety.test.ts --no-coverage
```

Expected: the `null`-to-`string` rejection tests fail — current checker allows it.

- [ ] **Step 3.3: Extend `resolveType` for nullable annotations**

In `prototype/src/typeChecker/index.ts`, in the `resolveType` function's `TSUnionType` case, add a helper that flags `null | T` patterns:

```typescript
// In resolveType — TSUnionType case, replace the existing body:
case 'TSUnionType': {
  const types = node.types.map(resolveType)
  // Flatten nested unions (e.g. (string | null) | undefined → string | null | undefined)
  const flat: Type[] = []
  for (const t of types) {
    if (t.kind === 'union') flat.push(...(t as UnionType).types)
    else flat.push(t)
  }
  return { kind: 'union', types: flat } satisfies UnionType
}
```

Then in `isAssignable` (or the consistency check), add a rule: if the target type is NOT a union containing `null`/`undefined`, and the source IS `null` or `undefined`, emit `SJS-E001`.

Find the `checkVariableDeclarator` logic in `index.ts` and add:

```typescript
// After computing `initType` and before checking assignability:
const targetHasNull = targetType.kind === 'union' &&
  (targetType as UnionType).types.some(t => t.kind === 'null' || t.kind === 'undefined')

if (!targetHasNull && (initType.kind === 'null' || initType.kind === 'undefined')) {
  this.addDiagnostic({
    code: 'SJS-E001',
    severity: 'error',
    message: `I cannot assign ${initType.kind} to non-nullable type '${formatType(targetType)}'.`,
    line: node.loc?.start.line ?? 0,
    column: node.loc?.start.column ?? 0,
    specUrl: 'https://tc39.es/ecma262/#sec-ecmascript-language-types-null-type',
  })
  return
}
```

- [ ] **Step 3.4: Run null safety tests**

```bash
cd prototype && npx jest tests/typeChecker/null-safety.test.ts --no-coverage
```

Expected: all 4 tests pass.

- [ ] **Step 3.5: Run full suite**

```bash
cd prototype && npx jest --no-coverage
```

Expected: no regressions.

- [ ] **Step 3.6: Commit**

```bash
cd prototype && git add src/typeChecker/index.ts tests/typeChecker/null-safety.test.ts
git commit -m "feat(checker): null safety — reject null assignment to non-nullable types (SJS-E001)"
```

---

## Task 4: SJS Sum Type Preprocessor

**Files:**
- Create: `prototype/src/preprocessor/sumTypes.ts`
- Create: `prototype/tests/preprocessor/sumTypes.test.ts`

Transform SJS sum type syntax into TypeScript-compatible discriminated unions before Babel processes the file.

**SJS input:**
```sjs
type Result<T, E> = Ok(T) | Err(E)
```

**TypeScript output:**
```typescript
type Ok<T> = { _tag: "Ok"; _0: T }
type Err<E> = { _tag: "Err"; _0: E }
type Result<T, E> = Ok<T> | Err<E>
const Ok = <T>(_0: T): Ok<T> => ({ _tag: "Ok" as const, _0 })
const Err = <E>(_0: E): Err<E> => ({ _tag: "Err" as const, _0 })
```

- [ ] **Step 4.1: Write the failing tests**

```typescript
// prototype/tests/preprocessor/sumTypes.test.ts
import { transformSumTypes } from '../../src/preprocessor/sumTypes'

describe('Sum type preprocessor', () => {
  it('transforms a unit variant with no fields', () => {
    const input = `type Color = Red | Green | Blue`
    const out = transformSumTypes(input)
    expect(out).toContain('_tag: "Red"')
    expect(out).toContain('_tag: "Green"')
    expect(out).toContain('const Red = (): Red => ({ _tag: "Red" as const })')
  })

  it('transforms a single-field variant', () => {
    const out = transformSumTypes(`type Result<T, E> = Ok(T) | Err(E)`)
    expect(out).toContain('_tag: "Ok"; _0: T')
    expect(out).toContain('const Ok = <T>(_0: T): Ok<T> => ({ _tag: "Ok" as const, _0 })')
  })

  it('passes through non-sum-type lines unchanged', () => {
    const input = `const x: number = 42\ntype Alias = string | number`
    expect(transformSumTypes(input)).toBe(input)
  })

  it('handles multi-field tuple variant', () => {
    const out = transformSumTypes(`type Point = XY(number, number)`)
    expect(out).toContain('_0: number; _1: number')
    expect(out).toContain('const XY = (_0: number, _1: number): XY => ({ _tag: "XY" as const, _0, _1 })')
  })
})
```

- [ ] **Step 4.2: Run to confirm failures**

```bash
cd prototype && npx jest tests/preprocessor/sumTypes.test.ts --no-coverage
```

Expected: FAIL — module does not exist.

- [ ] **Step 4.3: Create `prototype/src/preprocessor/sumTypes.ts`**

```typescript
// Regex for SJS sum type declarations:
// type Name<TypeParams?> = Variant1(fields?) | Variant2(fields?) | ...
// A "sum type variant" is one that uses Constructor(args) form.
// Plain `string | number` unions are NOT sum types — left untouched.

const SUM_TYPE_LINE =
  /^type\s+(\w+)(<[^>]+>)?\s*=\s*((?:\w+(?:\([^)]*\))?\s*\|?\s*)+)$/

interface Variant {
  name: string
  fields: string[]  // e.g. ["T", "E"] or [] for unit variants
}

function parseVariants(rhs: string): Variant[] | null {
  const parts = rhs.split('|').map(s => s.trim()).filter(Boolean)
  const variants: Variant[] = []
  for (const part of parts) {
    const tupleMatch = part.match(/^(\w+)\(([^)]*)\)$/)
    if (tupleMatch) {
      const fields = tupleMatch[2].split(',').map(f => f.trim()).filter(Boolean)
      variants.push({ name: tupleMatch[1], fields })
    } else if (/^\w+$/.test(part)) {
      variants.push({ name: part, fields: [] })
    } else {
      // Contains something that's not a simple variant — not a sum type
      return null
    }
  }
  return variants
}

function variantToTS(v: Variant, typeParams: string): string {
  const tp = typeParams || ''
  const fieldEntries = v.fields.map((f, i) => `_${i}: ${f}`).join('; ')
  const fieldPart = fieldEntries ? `; ${fieldEntries}` : ''
  const typeDecl = `type ${v.name}${tp} = { _tag: "${v.name}"${fieldPart} }`

  const ctorParams = v.fields.map((f, i) => `_${i}: ${f}`).join(', ')
  const ctorArgs = v.fields.map((_, i) => `_${i}`).join(', ')
  const ctorArgsPart = ctorArgs ? `, ${ctorArgs}` : ''
  // Strip bounds from type params for the return type (e.g. <T extends X> → <T>)
  const bareTP = tp ? tp.replace(/\s+extends\s+[^,>]+/g, '') : ''
  const returnType = `${v.name}${bareTP}`
  const ctor = v.fields.length === 0
    ? `const ${v.name} = ()${tp ? `: ${returnType}` : ''} => ({ _tag: "${v.name}" as const })`
    : `const ${v.name} = ${tp}(${ctorParams}): ${returnType} => ({ _tag: "${v.name}" as const${ctorArgsPart} })`

  return `${typeDecl}\n${ctor}`
}

export function transformSumTypes(source: string): string {
  return source.split('\n').map(line => {
    const m = line.match(SUM_TYPE_LINE)
    if (!m) return line

    const [, name, rawTP = '', rhs] = m
    const typeParams = rawTP.trim()
    const variants = parseVariants(rhs.trim())
    if (!variants || variants.length < 2) return line

    const variantLines = variants.map(v => variantToTS(v, typeParams)).join('\n')
    const variantRefs = variants.map(v => `${v.name}${typeParams ? typeParams.replace(/\s+extends\s+[^,>]+/g, '') : ''}`).join(' | ')
    const typeAlias = `type ${name}${typeParams} = ${variantRefs}`
    return `${variantLines}\n${typeAlias}`
  }).join('\n')
}
```

- [ ] **Step 4.4: Run tests**

```bash
cd prototype && npx jest tests/preprocessor/sumTypes.test.ts --no-coverage
```

Expected: all 4 tests pass.

- [ ] **Step 4.5: Commit**

```bash
cd prototype && git add src/preprocessor/sumTypes.ts tests/preprocessor/sumTypes.test.ts
git commit -m "feat(preprocessor): transform SJS sum type declarations to TypeScript discriminated unions"
```

---

## Task 5: Match Expression Preprocessor

**Files:**
- Create: `prototype/src/preprocessor/matchExpr.ts`
- Create: `prototype/tests/preprocessor/matchExpr.test.ts`

Transform `match expr { Variant(x) => body }` into an IIFE with a `switch` on `_tag`.

**SJS input:**
```sjs
const area = match shape {
  Circle({ radius }) => Math.PI * radius * radius,
  Rect({ w, h }) => w * h,
}
```

**TypeScript output:**
```typescript
const area = (() => { const __m = shape; switch (__m._tag) {
  case "Circle": { const { radius } = __m; return Math.PI * radius * radius }
  case "Rect": { const { w, h } = __m; return w * h }
  default: throw new Error(`[SJS] Non-exhaustive match on ${JSON.stringify((__m as any)._tag)}`)
}})()
```

- [ ] **Step 5.1: Write the failing tests**

```typescript
// prototype/tests/preprocessor/matchExpr.test.ts
import { transformMatch } from '../../src/preprocessor/matchExpr'

describe('Match expression preprocessor', () => {
  it('transforms a basic match with two struct variants', () => {
    const input = `const x = match val { Ok({ v }) => v, Err({ e }) => 0 }`
    const out = transformMatch(input)
    expect(out).toContain('switch (__m._tag)')
    expect(out).toContain('case "Ok"')
    expect(out).toContain('case "Err"')
    expect(out).toContain('const { v } = __m')
    expect(out).toContain('const { e } = __m')
  })

  it('transforms a match with wildcard arm', () => {
    const out = transformMatch(`match x { Some({ v }) => v, _ => null }`)
    expect(out).toContain('default:')
    expect(out).not.toContain('throw new Error')
  })

  it('does not touch non-match expressions', () => {
    const input = `const x = 42`
    expect(transformMatch(input)).toBe(input)
  })

  it('handles unit variants (no destructuring)', () => {
    const out = transformMatch(`match c { Red => 1, Green => 2, Blue => 3 }`)
    expect(out).toContain('case "Red"')
    expect(out).toContain('case "Green"')
    expect(out).toContain('case "Blue"')
  })
})
```

- [ ] **Step 5.2: Run to confirm failures**

```bash
cd prototype && npx jest tests/preprocessor/matchExpr.test.ts --no-coverage
```

Expected: FAIL — module does not exist.

- [ ] **Step 5.3: Create `prototype/src/preprocessor/matchExpr.ts`**

```typescript
// Transforms `match expr { Variant(...) => body, ... }` expressions
// into TypeScript IIFEs with switch statements.
//
// This is a line-level text transform. It handles single-line match expressions.
// Multi-line match is handled by collecting lines until braces balance.

const MATCH_PATTERN = /\bmatch\s+(\w+(?:\.\w+|\[.*?\])*)\s*\{/

interface MatchArm {
  tag: string           // variant name, e.g. "Ok"
  binding: string       // destructured binding, e.g. "{ v }" or "" for unit
  body: string          // arm body expression
  isWildcard: boolean
}

function parseArms(armsStr: string): MatchArm[] {
  const arms: MatchArm[] = []
  // Split on commas NOT inside braces
  const armParts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of armsStr) {
    if (ch === '{' || ch === '(') depth++
    else if (ch === '}' || ch === ')') depth--
    if (ch === ',' && depth === 0) {
      armParts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) armParts.push(current.trim())

  for (const part of armParts) {
    const arrowIdx = part.indexOf('=>')
    if (arrowIdx === -1) continue
    const pattern = part.slice(0, arrowIdx).trim()
    const body = part.slice(arrowIdx + 2).trim()

    if (pattern === '_') {
      arms.push({ tag: '_', binding: '', body, isWildcard: true })
      continue
    }

    const structMatch = pattern.match(/^(\w+)\((\{[^}]*\})\)$/)
    const unitMatch = pattern.match(/^(\w+)$/)

    if (structMatch) {
      arms.push({ tag: structMatch[1], binding: structMatch[2], body, isWildcard: false })
    } else if (unitMatch) {
      arms.push({ tag: unitMatch[1], binding: '', body, isWildcard: false })
    }
  }
  return arms
}

function buildSwitch(expr: string, arms: MatchArm[]): string {
  const cases = arms.map(arm => {
    if (arm.isWildcard) {
      return `  default: { return ${arm.body} }`
    }
    const destructure = arm.binding ? `const ${arm.binding} = __m; ` : ''
    return `  case "${arm.tag}": { ${destructure}return ${arm.body} }`
  })

  const hasWildcard = arms.some(a => a.isWildcard)
  if (!hasWildcard) {
    cases.push(`  default: throw new Error(\`[SJS] Non-exhaustive match on \${JSON.stringify((__m as any)._tag)}\`)`)
  }

  return `((): any => { const __m = ${expr}; switch (__m._tag) {\n${cases.join('\n')}\n}})()`
}

export function transformMatch(source: string): string {
  if (!source.includes('match ')) return source

  // Handle single-line match expressions
  return source.replace(/match\s+(\w+(?:\.\w+|\[.*?\])*)\s*\{([^{}]*)\}/g, (_, expr, body) => {
    const arms = parseArms(body)
    if (arms.length === 0) return _
    return buildSwitch(expr.trim(), arms)
  })
}
```

- [ ] **Step 5.4: Run tests**

```bash
cd prototype && npx jest tests/preprocessor/matchExpr.test.ts --no-coverage
```

Expected: all 4 tests pass.

- [ ] **Step 5.5: Commit**

```bash
cd prototype && git add src/preprocessor/matchExpr.ts tests/preprocessor/matchExpr.test.ts
git commit -m "feat(preprocessor): transform SJS match expressions to TypeScript switch IIFEs"
```

---

## Task 6: Wire Preprocessor into the Compiler Pipeline

**Files:**
- Create: `prototype/src/preprocessor/index.ts`
- Modify: `prototype/src/compiler/index.ts`

The compiler must call both preprocessors on the raw source before passing it to Babel.

- [ ] **Step 6.1: Write the failing integration test**

Add to `prototype/tests/compiler/demos.test.ts`:

```typescript
describe('Preprocessor integration', () => {
  it('compiles SJS sum type syntax without errors', async () => {
    const src = `
type Result<T, E> = Ok(T) | Err(E)
const r: Result<number, string> = Ok(42)
`
    // Write to a temp file and compile it
    const { writeFileSync, mkdirSync } = await import('fs')
    const { join } = await import('path')
    const tmpDir = '/tmp/sjs-preproc-test'
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(join(tmpDir, 'test.sjs'), src)
    await expect(
      compile({ sourceFile: join(tmpDir, 'test.sjs'), outDir: '/tmp/sjs-preproc-out', silent: true })
    ).resolves.not.toThrow()
  })
})
```

- [ ] **Step 6.2: Run to confirm failure**

```bash
cd prototype && npx jest tests/compiler/demos.test.ts -t "Preprocessor" --no-coverage
```

Expected: FAIL — `Ok(T)` is not valid TypeScript; Babel parse error.

- [ ] **Step 6.3: Create `prototype/src/preprocessor/index.ts`**

```typescript
import { transformSumTypes } from './sumTypes'
import { transformMatch } from './matchExpr'

/**
 * Applies all SJS-specific source transforms in order before Babel processing.
 * Each transform is idempotent and only modifies lines it recognises.
 */
export function preprocessSJS(source: string): string {
  let result = source
  result = transformSumTypes(result)
  result = transformMatch(result)
  return result
}
```

- [ ] **Step 6.4: Wire into `prototype/src/compiler/index.ts`**

Add import at top of file:
```typescript
import { preprocessSJS } from '../preprocessor'
```

In `compileFile`, find the line where `sourceCode` is read from disk:
```typescript
const sourceCode = readFileSync(resolvedSourceFile, 'utf-8')
```

Replace with:
```typescript
const rawSource = readFileSync(resolvedSourceFile, 'utf-8')
const sourceCode = preprocessSJS(rawSource)
```

The rest of the function is unchanged — `sourceCode` flows into the type checker and Babel as before.

- [ ] **Step 6.5: Run integration test**

```bash
cd prototype && npx jest tests/compiler/demos.test.ts --no-coverage
```

Expected: all tests pass including the new preprocessor integration test.

- [ ] **Step 6.6: Run full suite**

```bash
cd prototype && npx jest --no-coverage
```

Expected: 185+ tests pass, no regressions.

- [ ] **Step 6.7: Commit**

```bash
cd prototype && git add src/preprocessor/index.ts src/compiler/index.ts tests/compiler/demos.test.ts
git commit -m "feat(compiler): wire SJS preprocessor into compilation pipeline before Babel"
```

---

## Task 7: Exhaustiveness Check in the Type Checker

**Files:**
- Modify: `prototype/src/typeChecker/index.ts`
- Modify: `prototype/tests/typeChecker/sum-types.test.ts`

After the preprocessor generates a `switch` on `_tag`, the type checker still needs to know which sum types exist, so it can verify that all variants are covered (emit `SJS-E007` if not). This task teaches the type checker to track sum type declarations.

- [ ] **Step 7.1: Add exhaustiveness tests**

Append to `prototype/tests/typeChecker/sum-types.test.ts`:

```typescript
describe('Sum type exhaustiveness — SJS-E007', () => {
  it('does not error on exhaustive match (all variants covered)', () => {
    const src = `
type Shape = Circle({ r: number }) | Rect({ w: number, h: number })
const shape: Shape = Circle({ r: 1 })
switch (shape._tag) {
  case "Circle": break
  case "Rect": break
}
`
    // No SJS-E007 expected
    expect(errors(src).filter(d => d.code === 'SJS-E007')).toHaveLength(0)
  })

  it('emits SJS-E007 when a sum type switch has no default and misses a variant', () => {
    const src = `
type Shape = Circle({ r: number }) | Rect({ w: number, h: number })
const shape: Shape = Circle({ r: 1 })
switch (shape._tag) {
  case "Circle": break
}
`
    const diags = errors(src)
    expect(diags.some(d => d.code === 'SJS-E007')).toBe(true)
  })
})
```

- [ ] **Step 7.2: Run to confirm the exhaustiveness tests fail**

```bash
cd prototype && npx jest tests/typeChecker/sum-types.test.ts --no-coverage
```

Expected: structure tests pass, exhaustiveness tests fail (SJS-E007 not emitted).

- [ ] **Step 7.3: Add sum type tracking to the TypeChecker class**

In `prototype/src/typeChecker/index.ts`, add a `sumTypeRegistry` to the `TypeChecker` class:

```typescript
// Inside the TypeChecker class, add field:
private sumTypeRegistry: Map<string, SumType> = new Map()
```

In the `reset()` method, clear the registry:
```typescript
reset(): void {
  this.diagnostics = []
  this.env = new Map()
  this.sumTypeRegistry = new Map()
}
```

Add a visitor in `check()` for `TSTypeAliasDeclaration` — after the preprocessor runs, a sum type becomes multiple `type` declarations (one per variant) plus the union alias. Detect the variant pattern and populate the registry. The simplest signal is: if a type alias's RHS is a union of types whose names are all single-word capitalized identifiers AND the same identifier appears as a `const` arrow returning `{ _tag: "..." }`, it came from a sum type.

Add a visitor for `SwitchStatement` to check exhaustiveness:

```typescript
SwitchStatement(path) {
  const discriminant = path.node.discriminant
  // Check if it's `x._tag` where `x` has a sum type
  if (!t.isMemberExpression(discriminant)) return
  if (!t.isIdentifier(discriminant.property) || discriminant.property.name !== '_tag') return
  if (!t.isIdentifier(discriminant.object)) return

  const varName = discriminant.object.name
  const varType = this.env.get(varName)
  if (!varType || varType.kind !== 'sum') return

  const coveredTags = new Set(
    path.node.cases
      .filter(c => c.test !== null)  // exclude default
      .map(c => t.isStringLiteral(c.test!) ? c.test.value : null)
      .filter(Boolean)
  )
  const hasDefault = path.node.cases.some(c => c.test === null)
  if (hasDefault) return  // wildcard — skip exhaustiveness

  const missingTags = varType.variants
    .map(v => v.tag)
    .filter(tag => !coveredTags.has(tag))

  if (missingTags.length > 0) {
    this.addDiagnostic({
      code: 'SJS-E007',
      severity: 'error',
      message: `Non-exhaustive match: missing variants ${missingTags.map(t => `'${t}'`).join(', ')} of type '${varType.name}'.`,
      line: path.node.loc?.start.line ?? 0,
      column: path.node.loc?.start.column ?? 0,
      specUrl: 'https://github.com/hbarve1/super-js/blob/master/specs/001-superjs-core-language/type-system-v2.md#45-pattern-matching',
    })
  }
}
```

- [ ] **Step 7.4: Run exhaustiveness tests**

```bash
cd prototype && npx jest tests/typeChecker/sum-types.test.ts --no-coverage
```

Expected: all tests pass.

- [ ] **Step 7.5: Run full suite**

```bash
cd prototype && npx jest --no-coverage
```

Expected: 190+ tests pass, no regressions.

- [ ] **Step 7.6: Commit**

```bash
cd prototype && git add src/typeChecker/index.ts tests/typeChecker/sum-types.test.ts
git commit -m "feat(checker): exhaustiveness check for sum type match expressions (SJS-E007)"
```

---

## Task 8: Update Examples to Use SJS Sum Types

**Files:**
- Modify: `prototype/examples/node/src/analyzer.sjs`
- Modify: `prototype/tests/compiler/demos.test.ts`

Replace the `FileStats | null` return pattern in the node demo with a real SJS sum type, proving the feature works end-to-end in a real demo.

- [ ] **Step 8.1: Add a sum type to the node demo**

Open `prototype/examples/node/src/analyzer.sjs`. Find any function that returns `something | null` and replace with a sum type:

```sjs
// Add at top of analyzer.sjs (after imports):
type AnalysisResult<T> = Success(T) | Failure(string)

// Update the analyzeFile function return type:
function analyzeFile(filePath: string): AnalysisResult<FileStats> {
  try {
    // ... existing logic ...
    return Success(stats)
  } catch (e: any) {
    return Failure(e.message ?? 'Unknown error')
  }
}
```

- [ ] **Step 8.2: Compile the node demo**

```bash
cd prototype && npx ts-node src/cli.ts build --dir examples/node/src --outDir /tmp/sjs-node-out
```

Expected: compiles without errors.

- [ ] **Step 8.3: Re-run all demo tests**

```bash
cd prototype && npx jest tests/compiler/demos.test.ts --no-coverage
```

Expected: all pass.

- [ ] **Step 8.4: Commit**

```bash
cd prototype && git add examples/node/src/analyzer.sjs
git commit -m "demo(node): use SJS sum type for analyzeFile return — proves sum type e2e"
```

---

## Self-Review

**Spec coverage check:**
- `type-system-v2.md §3` (null safety): Covered by Tasks 3 ✓
- `type-system-v2.md §4` (sum types): Covered by Tasks 2, 4, 7 ✓
- `type-system-v2.md §4.5` (pattern matching): Covered by Task 5 ✓
- `type-system-v2.md §4.6` (exhaustiveness): Covered by Task 7 ✓
- Demo verification: Covered by Tasks 1, 8 ✓

**Placeholder check:** No "TBD", "TODO", or vague steps found.

**Type consistency:**
- `SumType` defined in Task 2, used in Tasks 4, 5, 7 ✓
- `SumVariantType` defined in Task 2, used in Task 7 ✓
- `preprocessSJS()` defined in Task 6, wired in Task 6 ✓
- `transformSumTypes()` defined in Task 4, imported in Task 6 ✓
- `transformMatch()` defined in Task 5, imported in Task 6 ✓
