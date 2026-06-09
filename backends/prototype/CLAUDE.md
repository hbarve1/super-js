# backends/prototype/ — Agent Context

This is the **Phase 1 Babel-based prototype** of SuperJS. It is the production CLI and the canonical reference implementation. All new diagnostic rules are first implemented here. The plain-JS `compiler/` then mirrors them for cross-validation.

**Do not break this package.** It is the ground truth for diagnostic correctness.

Read `specs/mission.md` for project goals. Read `specs/error-codes.md` for the canonical list of diagnostic codes before touching anything that emits diagnostics.

---

## Phase 1 status

- Feature-complete as a reference implementation
- Babel-based: uses `@babel/parser` + `@babel/traverse` for AST handling
- TypeScript source compiled to `dist/` via `tsc`
- All type error codes `SJS-E001`–`SJS-E019`, warnings `SJS-W001`–`SJS-W010`, and lint codes `SJS-L001`–`SJS-L005` (as of the current registry) are implemented or planned here first
- The `compiler/` (Phase 2) validates its output against this one — they must agree

---

## Directory layout

```
backends/prototype/
├── src/
│   ├── cli.ts                     # CLI entry point (commander-based)
│   ├── diagnostic.ts              # DiagnosticJson + human-readable text renderer
│   ├── compiler/
│   │   ├── index.ts               # Compiler pipeline orchestrator
│   │   └── types.ts               # Compiler options types
│   ├── preprocessor/
│   │   ├── index.ts               # Preprocessor pipeline entry
│   │   ├── accessModifiers.ts     # Access modifier lowering
│   │   ├── matchExpr.ts           # match expression → if-chain lowering
│   │   ├── nullSafety.ts          # Null safety rewrites
│   │   └── sumTypes.ts            # Sum type declaration lowering
│   ├── typeChecker/
│   │   ├── index.ts               # TypeChecker class (4000+ lines — main file)
│   │   └── types.ts               # Type representation (Type union, PrototypeDiagnostic)
│   ├── linter/
│   │   ├── index.ts               # Linter (SJS-L001–L005)
│   │   └── types.ts               # Linter rule types
│   ├── formatter/
│   │   └── index.ts               # Formatter (delegates to Prettier)
│   ├── tester/
│   │   └── index.ts               # Test runner
│   ├── runtime/
│   │   └── jsx.ts                 # SJS JSX runtime (sjs.createElement, sjs.Fragment)
│   └── watch/
│       ├── watcher.ts             # File watcher (chokidar)
│       ├── dependency-graph.ts    # Module dependency graph for watch mode
│       ├── import-extractor.ts    # Static import path extractor
│       └── topo-sort.ts           # Topological sort for recompilation order
├── tests/
│   ├── cli/
│   │   ├── formatter.test.ts
│   │   ├── json-output.test.ts
│   │   ├── linter.test.ts
│   │   └── runner.test.ts
│   ├── compiler/
│   │   ├── compile.test.ts
│   │   ├── demos.test.ts
│   │   └── type-errors.test.ts
│   ├── golden/
│   │   ├── golden.test.ts         # Golden-file test runner
│   │   └── fixtures/              # *.sjs + *.expected.js pairs
│   ├── preprocessor/
│   │   ├── matchExpr.test.ts
│   │   └── sumTypes.test.ts
│   ├── typeChecker/
│   │   ├── array-types.test.ts
│   │   ├── binary-expr.test.ts
│   │   ├── class-features.test.ts
│   │   ├── ecmascript-features.test.ts
│   │   ├── null-safety.test.ts
│   │   ├── strict-mode.test.ts
│   │   ├── sum-types.test.ts
│   │   └── type-checker.test.ts   # Core type-checker tests (largest suite)
│   └── watch/
│       ├── dependency-graph.test.ts
│       ├── import-extractor.test.ts
│       ├── topo-sort.test.ts
│       └── watcher.test.ts
├── build/                         # Build output (gitignored)
├── dist/                          # TypeScript compilation output
├── package.json
├── tsconfig.json
└── README.md
```

---

## How to run tests

All commands run from `backends/prototype/`:

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Specific suite
npx jest tests/typeChecker/type-checker.test.ts
npx jest tests/typeChecker/null-safety.test.ts
npx jest tests/golden/golden.test.ts
```

Tests use Jest + ts-jest (TypeScript is transpiled on the fly; no build step needed for tests).

---

## How the TypeChecker works

`src/typeChecker/index.ts` contains a single `TypeChecker` class (currently ~4300 lines). It is used as a Babel visitor:

```ts
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import { TypeChecker } from './src/typeChecker'

const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
const checker = new TypeChecker()
traverse(ast, { enter(path) { checker.check(path) } })
const diagnostics = checker.getDiagnostics()
```

The checker calls `this.report(...)` to accumulate `PrototypeDiagnostic` objects:

```ts
this.report({
  code: 'SJS-E001',
  severity: 'error',
  message: `Cannot assign 'null' to non-nullable type 'string'.`,
  node: path.node,
  specUrl: 'https://tc39.es/ecma262/#sec-let-and-const-declarations',
})
```

The `PrototypeDiagnostic` interface is in `src/typeChecker/types.ts`:

```ts
export interface PrototypeDiagnostic {
  code: string
  severity: 'error' | 'warning' | 'info'
  message: string
  line: number
  column: number
  specUrl: string
}
```

---

## How to add a diagnostic

### Step 1 — Reserve the code in `specs/error-codes.md`

Pick the next available number. The current highest codes are `SJS-E019`, `SJS-W010`, `SJS-L005`. Never skip numbers or reuse retired ones.

### Step 2 — Create `specs/error-codes/SJS-EXXX.md`

Use an existing file (e.g., `specs/error-codes/SJS-E001.md`) as a model:

```markdown
# SJS-EXXX — Short description

**Severity:** error
**Category:** type-check
**Stage:** Stage 1

## Description
...

## Example
```sjs
// ✗ error
```

## Fix
```sjs
// ✓ correct
```

## Related codes
- `SJS-E001` — ...
```

### Step 3 — Add emission to `src/typeChecker/index.ts`

Find the appropriate checker method or add a new private method. The TypeChecker uses private methods like `checkVariableDeclarator`, `checkFunctionDeclaration`, etc. Look for the relevant AST node type in the existing visitor structure.

```ts
// Example: adding a check for a new node type
private checkMyNewRule(path: NodePath<t.SomeNode>): void {
  const node = path.node
  if (/* condition that violates the rule */) {
    this.report({
      code: 'SJS-EXXX',
      severity: 'error',
      message: `Human-readable explanation of the problem.`,
      node,
      specUrl: 'https://tc39.es/ecma262/#relevant-section',
    })
  }
}
```

Wire it into the main `check(path)` method which dispatches based on `path.type`.

### Step 4 — Write tests

Add a new test file at `tests/typeChecker/your-feature.test.ts` or add cases to an existing relevant file. The helper pattern used throughout the test suite:

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

describe('SJS-EXXX: description', () => {
  it('emits the code for the violation', () => {
    const diags = errors('/* violating SJS source */')
    expect(diags.some(d => d.code === 'SJS-EXXX')).toBe(true)
  })

  it('accepts the valid form', () => {
    expect(errors('/* valid SJS source */')).toHaveLength(0)
  })
})
```

### Step 5 — Update `specs/language/060-error-codes-map.md`

Add the new code and the feature/condition it maps to.

---

## Relationship to `compiler/` (Phase 2)

- **This package is the source of truth.** The plain-JS `compiler/` is a correctness validator that must produce the same diagnostics for any given input.
- When you add a new rule here, add an issue or TODO in `compiler/src/type-checker/type-checker.js` so the Phase 2 team knows to mirror it.
- Golden file tests in `tests/golden/` test compilation output (`.sjs` → `.js`). If you change how a construct is lowered, update the corresponding `*.expected.js` fixture.

---

## Key invariants — do not break

1. **`tests/` must all pass.** Run `npm test` before opening a PR. The CI matrix runs tests on all changed packages.
2. **Diagnostic codes match `specs/error-codes.md`.** The `code` field of every `this.report(...)` call must be a code listed in that registry.
3. **`specUrl` must point to a real ECMA-262 or SJS spec URL.** Use `https://tc39.es/ecma262/#sec-*` for ECMAScript rules. Use the SJS specs path for SJS-specific rules.
4. **Golden fixtures are checked in.** The `.expected.js` files under `tests/golden/fixtures/` are the authoritative output. If compilation output changes, update the expected files intentionally (not accidentally).
5. **The `PrototypeDiagnostic` shape must not change.** Other tools (CLI, JSON output, VS Code extension) depend on the `code`, `severity`, `message`, `line`, `column`, `specUrl` fields being stable.
