# @superjs/compiler-types

Shared TypeScript declarations for the SuperJS compiler pipeline. Every package
in the SuperJS monorepo that produces or consumes AST nodes, diagnostics, spans,
types, or symbols imports from this package rather than declaring its own copies.

This package is **declaration-only** — it ships no runtime code. It contains only
`.d.ts` files (and the TypeScript source that generates them).

---

## Install

```bash
npm install @superjs/compiler-types
```

Requires Node.js ≥ 20 and TypeScript ≥ 5.0 (`strict` mode recommended).

---

## Key exported types

### `SourceSpan` — source location

```ts
import type { SourceSpan } from '@superjs/compiler-types';

// Describes a byte range inside a source file, with line/col for display.
const span: SourceSpan = {
  file: 'src/main.sjs',
  startLine: 10,
  startCol: 4,
  endLine: 10,
  endCol: 15,
  byteStart: 203,
  byteEnd: 214,
};
```

All line and column numbers are **1-based**. `byteStart`/`byteEnd` are byte offsets
into the UTF-8 encoded source file (0-based, exclusive end).

A helper `spanUnion(a, b): SourceSpan` merges two spans into the smallest span that
covers both. Useful when building parent AST nodes from child spans.

---

### `AstNode` — base AST interface

```ts
import type { AstNode, AstNodeWithChildren } from '@superjs/compiler-types';

// Every AST node carries a `kind` discriminant and a `span`.
function visit(node: AstNode): void {
  console.log(node.kind, node.span.startLine);
}

// Nodes with children implement AstNodeWithChildren.
function walkChildren(node: AstNodeWithChildren): void {
  for (const child of node.children) {
    visit(child);
  }
}
```

Concrete node shapes (e.g. `FunctionDecl`, `BinaryExpr`) are defined in
`packages/compiler/src/ast/` and extend `AstNode` by adding typed fields. They are
not part of `@superjs/compiler-types` because they change with each grammar update;
only the stable base interface lives here.

---

### `Diagnostic` and `Severity` — compiler messages

```ts
import type { Diagnostic, Severity } from '@superjs/compiler-types';

function printDiagnostic(d: Diagnostic): void {
  // d.version is always "1" — used for schema evolution
  // d.code   is "SJS-E001", "SJS-W012", etc.
  // d.severity is 'error' | 'warning' | 'info'
  console.error(`[${d.severity.toUpperCase()}] ${d.code}: ${d.message}`);
  console.error(`  at ${d.span.file}:${d.span.startLine}:${d.span.startCol}`);

  for (const label of d.labels) {
    console.error(`  ${label.style}: ${label.message}`);
  }
  for (const note of d.notes) {
    console.error(`  note: ${note}`);
  }
  if (d.fix) {
    console.error(`  fix: ${d.fix.message}`);
  }
}
```

The `Diagnostic` interface is the canonical output format for the `--format json`
and `--format ndjson` CLI modes. Its shape is validated by `spec/diagnostics.schema.json`.

`DiagnosticFix` carries machine-applicable code fixes (used by the LSP
`textDocument/codeAction` handler and `superjs fix` CLI in Stage 3).

---

### `SuperJSType` (exported as `SJSType`) — the type system discriminated union

```ts
import type { SJSType } from '@superjs/compiler-types';

function describeType(t: SJSType): string {
  switch (t.kind) {
    case 'string':   return 'string';
    case 'number':   return 'number';
    case 'boolean':  return 'boolean';
    case 'null':     return 'null';
    case 'undefined':return 'undefined';
    case 'dynamic':  return 'dynamic (runtime-checked)';
    case 'never':    return 'never';
    case 'void':     return 'void';
    case 'nullable': return `${describeType(t.inner)}?`;
    case 'array':    return `${describeType(t.elementType)}[]`;
    case 'function': return `(${t.params.map(p => p.name).join(', ')}) => ${describeType(t.returnType)}`;
    case 'object':   return `{ ${[...t.properties.keys()].join(', ')} }`;
    case 'interface':return t.name;
    case 'sum':      return t.name;
    case 'sumVariant': return t.tag;
    case 'generic':  return `${t.name}<${t.args.map(describeType).join(', ')}>`;
    case 'typeParamRef': return t.name;
    case 'symbol':   return 'symbol';
    case 'bigint':   return 'bigint';
  }
}
```

Key design decisions (from RFC-0001 and RFC-0002):

- **No `any`:** `AnyType` is intentionally absent. Use `DynamicType` (`kind: 'dynamic'`) as the runtime-checked escape hatch.
- **No intersection types:** `A & B` is banned per RFC-0002. There is no `IntersectionType` in this union.
- **Nullable is explicit:** `T?` desugars to `NullableType { inner: T }`, which the type checker expands to `T | null | undefined` during constraint solving.
- **Sum types use `_tag`:** `SumType` and `SumVariantType` represent `type Result<T,E> = Ok(T) | Err(E)`. At runtime they lower to `{ _tag: "Ok", _0: value }` objects (RFC-0003).

---

### `SJSSymbol` and `ModuleId` — symbol table entries

```ts
import type { SJSSymbol, ModuleId } from '@superjs/compiler-types';

// SJSSymbol is the canonical entry in the per-module symbol table.
// `id` is a monotonically increasing integer, unique within a compilation.
// `moduleId` is the resolved module path string.
const sym: SJSSymbol = {
  id: 42,
  name: 'greet',
  moduleId: 'src/greeting.sjs',
  declaredAt: { line: 5, col: 10 },
};
```

---

## Which stages depend on this package

| Stage | Consumer | What it uses |
|-------|----------|-------------|
| Stage 0 | `spec/` validation tooling | `Diagnostic` schema, `SourceSpan` |
| Stage 1 | `packages/compiler/` (lexer, parser, checker, codegen) | All exports |
| Stage 1 | `packages/lsp/` (LSP server) | `Diagnostic`, `SJSType`, `AstNode`, `SourceSpan` |
| Stage 2 | `packages/interop/` (`.d.ts` consumer) | `SJSType`, `SJSSymbol`, `ModuleId` |
| Stage 3 | `packages/formatter/`, `packages/linter/` | `AstNode`, `AstNodeWithChildren`, `Diagnostic` |
| Stage 3 | VS Code extension | `Diagnostic`, `SourceSpan` (via LSP) |
| Stage 4 | `packages/stdlib/` | `SJSType` (for typed stdlib declarations) |
| Stage 5 | `packages/vite-plugin/`, `packages/jest-transform/` | `Diagnostic`, `SourceSpan` |

---

## Versioning and semver policy

See [`SEMVER.md`](./SEMVER.md) for the full policy. Summary:

| Change type | Bump |
|-------------|------|
| Add optional field to an existing interface | **patch** |
| Add a new exported interface or type | **minor** |
| Add a required field to an existing interface | **major** |
| Remove or rename an exported symbol | **major** |
| Change the type of an existing field | **major** |

Every PR that modifies `src/` must include a changeset entry (run `npx changeset add`)
declaring the bump category. CI rejects PRs that change `src/` without a changeset.

The package is **semver-stable from `0.1.0-alpha.0`**. All Stages 1–5 import this
package; breaking changes require a coordinated update across all consumer packages.

See [`CHANGELOG.md`](./CHANGELOG.md) for the release history.
