# Data Model: Super.js Core Language

**Branch**: `001-superjs-core-language` | **Date**: 2026-05-26

---

## Core Entities

### SourceFile
Represents a single `.sjs` input file.

| Field | Type | Description |
|-------|------|-------------|
| `absolutePath` | string | Absolute filesystem path |
| `content` | string | Raw source text |
| `contentHash` | string | SHA-256 of content (for build cache) |
| `ast` | Program \| null | Parsed AST (null until parsed) |
| `imports` | string[] | Resolved absolute paths of all direct imports |
| `diagnostics` | Diagnostic[] | All errors/warnings for this file |
| `outputPath` | string \| null | Absolute path of the emitted `.js` file |
| `outputHash` | string \| null | SHA-256 of output (for cache invalidation) |
| `status` | FileStatus | Current compilation status |

**FileStatus enum**: `UNPROCESSED | PARSING | PARSED | TYPE_CHECKING | TYPE_CHECKED | EMITTING | EMITTED | ERROR | BLOCKED`

**BLOCKED** means a dependency failed to compile; this file was not attempted.

---

### Token
The smallest lexical unit produced by the lexer.

| Field | Type | Description |
|-------|------|-------------|
| `type` | TokenType | Enum: IDENTIFIER, NUMBER, STRING, KEYWORD, PUNCTUATOR, JSX_TAG, EOF, … |
| `value` | string | Raw text of the token |
| `line` | number | 1-based source line |
| `column` | number | 0-based column offset |
| `end` | { line, column } | End position (for multi-character tokens) |

---

### ASTNode
A node in the Abstract Syntax Tree. Mirrors Babel's AST node structure for prototype backend compatibility.

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Node type (e.g., `"VariableDeclaration"`, `"FunctionDeclaration"`) |
| `loc` | SourceLocation | `{ start: Position, end: Position }` |
| `children` | ASTNode[] | Child nodes (varies by node type) |
| `typeAnnotation` | TypeNode \| null | Super.js type annotation if present |
| `inferredType` | Type \| null | Type assigned by type checker (null until checked) |

**Key node types**: `Program`, `ImportDeclaration`, `ExportDeclaration`, `VariableDeclaration`, `FunctionDeclaration`, `ArrowFunctionExpression`, `ClassDeclaration`, `JSXElement`, `JSXFragment`, `TypeAnnotation`, `TypeAlias`, `InterfaceDeclaration`

---

### Type
A compile-time descriptor for a value. Immutable after creation.

| Field | Type | Description |
|-------|------|-------------|
| `kind` | TypeKind | Enum (see below) |
| `name` | string \| null | Human-readable name (for error messages) |
| `members` | TypeMember[] | For object/interface types |
| `elementType` | Type \| null | For array types |
| `typeParams` | Type[] | For generic instantiation |
| `returnType` | Type \| null | For function types |
| `paramTypes` | Type[] | For function types |
| `unionMembers` | Type[] | For union types |

**TypeKind enum**: `ANY | UNKNOWN | NEVER | VOID | UNDEFINED | NULL | BOOLEAN | NUMBER | STRING | BIGINT | SYMBOL | OBJECT | ARRAY | FUNCTION | UNION | INTERSECTION | TUPLE | GENERIC | LITERAL | CLASS | INTERFACE`

---

### Symbol
An entry in the symbol table representing a declared name in scope.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Identifier name |
| `type` | Type | Declared or inferred type |
| `declaration` | ASTNode | The AST node where this symbol was declared |
| `scope` | Scope | The scope that owns this symbol |
| `isConst` | boolean | True for `const` declarations |
| `isExported` | boolean | True if exported from module |

---

### Scope
A lexical scope in the symbol table. Scopes are tree-structured.

| Field | Type | Description |
|-------|------|-------------|
| `kind` | ScopeKind | `MODULE | FUNCTION | BLOCK | CLASS` |
| `parent` | Scope \| null | Parent scope (null for module scope) |
| `symbols` | Map<string, Symbol> | All symbols declared in this scope |
| `children` | Scope[] | Child scopes (for iteration) |

**Lookup rule**: Search current scope first, then walk `parent` chain. Stop at module scope. `any` is returned if no declaration found (gradual typing).

---

### Diagnostic
A compile-time error, warning, or informational message.

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Stable error code (e.g., `"SJS-E001"`) |
| `severity` | `"error" \| "warning" \| "note" \| "help"` | Severity level |
| `message` | string | Plain-English, first-person message |
| `file` | string | Absolute path of source file |
| `line` | number | 1-based line number |
| `column` | number | 0-based column |
| `endLine` | number | End line (for span highlighting) |
| `endColumn` | number | End column |
| `suggestion` | { description: string, replacement: string } \| null | Auto-fix suggestion |
| `notes` | Diagnostic[] | Related child diagnostics |
| `docsUrl` | string | Link to error code documentation |

---

### BuildInfo
Persisted cache for incremental compilation (written to `superjs.buildinfo`).

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Super.js version that wrote this file |
| `target` | string | Target ES version (e.g., `"es2022"`) |
| `files` | Map<string, FileCacheEntry> | Per-file cache entries |

**FileCacheEntry**:
| Field | Type | Description |
|-------|------|-------------|
| `contentHash` | string | SHA-256 of source content |
| `outputHash` | string | SHA-256 of emitted output |
| `imports` | string[] | Resolved import paths at last build |
| `diagnostics` | Diagnostic[] | Diagnostics from last build |

---

### ProjectConfig
Parsed contents of `superjs.config.json` at the project root.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `target` | `"es5" \| "es2015" \| "es2022"` | `"es2022"` | Output ECMAScript version |
| `outDir` | string | `"dist"` | Output directory relative to project root |
| `rootDir` | string | `"."` | Root directory for source files |
| `jsxFactory` | string | `"React.createElement"` | JSX factory function |
| `jsxFragment` | string | `"React.Fragment"` | JSX fragment factory |
| `strict` | boolean | `false` | Enable strict type checking (no implicit `any`) |
| `include` | string[] | `["**/*.sjs"]` | Glob patterns for included files |
| `exclude` | string[] | `["node_modules"]` | Glob patterns for excluded files |
| `lintRules` | LintRuleConfig | `{}` | Per-rule severity overrides |

---

## Entity Relationships

```
ProjectConfig
    └── governs compilation of ─→ SourceFile[]
              │
              ├── parsed into ─→ ASTNode (Program root)
              │                      └── contains ─→ ASTNode[] (recursive)
              │                                         └── has ─→ TypeAnnotation?
              │
              ├── produces ─→ Diagnostic[]
              │
              ├── imports (resolved) ─→ SourceFile[] (dependency graph)
              │
              └── type-checked via ─→ Scope (module root)
                                          └── contains ─→ Symbol[]
                                                              └── has type ─→ Type

BuildInfo
    └── caches results for ─→ SourceFile[]
```

## State Transitions

A `SourceFile` transitions through these states during a compilation run:

```
UNPROCESSED → PARSING → PARSED → TYPE_CHECKING → TYPE_CHECKED → EMITTING → EMITTED
                  ↓                     ↓                              ↓
                ERROR               ERROR                           ERROR
                                                    ↓
                                                BLOCKED (when a dependency errored)
```
