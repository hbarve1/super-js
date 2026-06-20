# WS-B2: DAP debugger

**Branch:** `feature/v1.0-dap`  
**Effort:** xlarge  
**Deps:** none (can start immediately, but large scope)  
**PR base:** `main`

## Objective

Implement a Debug Adapter Protocol (DAP) server for SuperJS that enables step-through debugging
in VS Code with sum-type-aware variable inspection.

## Context

- VS Code extension: `superjs/apps/vscode-extension/` — existing LSP-based extension
- LSP server: `superjs/libs/lsp/` — JSON-RPC over stdio
- Source maps: `specs/language/054-source-maps.md` — SJS emits source maps
- Sum type runtime encoding: `specs/design/ADR-003-sum-type-runtime-encoding.md` — `{_tag, _0, _1, ...}`
- DAP spec: https://microsoft.github.io/debug-adapter-protocol/
- Node.js DAP: `@vscode/debugadapter` npm package

## What to build

### 1. `@superjs/dap` library (`superjs/libs/dap/`)

A DAP server that:
- Speaks DAP protocol over stdio (same pattern as `@superjs/lsp`)
- Launches a Node.js child process running compiled SJS output
- Bridges VS Code debugger requests to the Node.js inspector protocol (CDP)
- Provides sum-type-aware variable formatting

### 2. CLI integration: `superjs debug`

```bash
superjs debug [--port N] <entrypoint.sjs>
```

Compiles `entrypoint.sjs` → `dist/entrypoint.js` (with source maps),
then starts the DAP server on stdio.

### 3. VS Code launch.json template

Shipped as part of `superjs init` templates and in the VS Code extension:

```json
{
  "type": "superjs",
  "request": "launch",
  "name": "Debug SuperJS",
  "program": "${workspaceFolder}/src/main.sjs",
  "outDir": "${workspaceFolder}/dist",
  "stopOnEntry": false
}
```

### 4. Sum-type inspect formatters

When the debugger stops and user inspects a variable whose runtime value is `{_tag: "Ok", _0: 42}`,
the formatter should display it as `Ok(42)` not the raw object.

Implement via VS Code "custom data visualizers" or by intercepting `variables` DAP response:
```typescript
function formatValue(value: unknown, type: string): string {
  if (typeof value === 'object' && value !== null && '_tag' in value) {
    const tag = (value as Record<string, unknown>)._tag as string;
    const payloads = Object.entries(value)
      .filter(([k]) => k.startsWith('_') && k !== '_tag')
      .map(([, v]) => JSON.stringify(v));
    return payloads.length > 0 ? `${tag}(${payloads.join(', ')})` : tag;
  }
  return JSON.stringify(value);
}
```

## Architecture

```
VS Code (debug UI)
    ↕ DAP protocol (stdin/stdout)
superjs-dap process
    ↕ CDP (Chrome DevTools Protocol)  
Node.js process (compiled SJS, --inspect flag)
```

## Key DAP methods to implement

| Method | Purpose |
|--------|---------|
| `initialize` | Capabilities handshake |
| `launch` | Compile SJS, start Node with `--inspect-brk` |
| `setBreakpoints` | Map SJS line → JS line via source map |
| `configurationDone` | Signal ready |
| `continue` | Resume execution |
| `next` | Step over |
| `stepIn` | Step into |
| `stepOut` | Step out |
| `pause` | Pause execution |
| `threads` | List threads (single thread for Node) |
| `stackTrace` | Get call stack (map JS frames → SJS frames via source map) |
| `scopes` | Get variable scopes |
| `variables` | Get variables in scope (apply sum-type formatter) |
| `evaluate` | Evaluate expression in stopped context |
| `disconnect` | Terminate debug session |

## Source map integration

Use `@superjs/compiler`'s source map output to translate:
- SJS line:col → JS line:col (for breakpoint setting)
- JS line:col → SJS line:col (for stacktrace display)

The `sourcemap-codec` or `source-map` npm package handles this.

## VS Code extension update

Add to `superjs/apps/vscode-extension/`:
1. `package.json`: add `"debuggers"` contribution point
2. `src/debugAdapter.ts`: launch `superjs debug` as external debug adapter
3. `launch.json` template: add to snippet library

```json
// package.json contribution
"debuggers": [{
  "type": "superjs",
  "label": "SuperJS Debug",
  "program": "./dist/debugAdapter.js",
  "runtime": "node",
  "languages": ["superjs"],
  "configurationAttributes": {
    "launch": {
      "required": ["program"],
      "properties": {
        "program": { "type": "string", "description": "SJS entrypoint" },
        "outDir": { "type": "string", "description": "Output directory", "default": "dist" },
        "stopOnEntry": { "type": "boolean", "default": false }
      }
    }
  }
}]
```

## Implementation phases

### Phase 1 — Minimal launch + breakpoints

1. `superjs/libs/dap/` NX lib with `@vscode/debugadapter` dep
2. Implement `initialize`, `launch`, `setBreakpoints`, `configurationDone`, `continue`, `disconnect`
3. `superjs debug` CLI command
4. Test: set breakpoint in a simple `.sjs` file, `F5` in VS Code, breakpoint hits
5. Stacktrace shows SJS file paths (not JS)

### Phase 2 — Step + variables

1. Implement `next`, `stepIn`, `stepOut`, `pause`
2. Implement `scopes`, `variables` with sum-type formatter
3. Test: step through a `match` expression, variables panel shows `Ok(42)` not `{_tag: "Ok", _0: 42}`

### Phase 3 — Evaluate + extension

1. Implement `evaluate` for watch expressions
2. Add VS Code extension debugger contribution
3. Ship `launch.json` snippet via `superjs init`

## Acceptance criteria

- [ ] `superjs debug <file.sjs>` compiles file and starts DAP server on stdio
- [ ] Breakpoints in `.sjs` files work in VS Code (hit when expected)
- [ ] Step over / step in / step out work
- [ ] Variables panel shows sum type values as `Tag(payload)` not raw `{_tag, _0}` objects
- [ ] Stack trace shows `.sjs` file paths with correct line numbers
- [ ] VS Code extension has `debuggers` contribution; `F5` with `launch.json` works
- [ ] `superjs init <template>` includes a `.vscode/launch.json` for debugging

## Notes

- This is LARGE — scope each phase as its own PR
- Source maps are the critical dependency — if the compiler doesn't emit accurate source maps, breakpoints will land on wrong lines
- Check `superjs/libs/compiler/src/lib/codegen.ts` for source map emission details
- `@vscode/debugadapter` is the reference implementation; study its examples before starting
- The inspect formatter may require a `@superjs/runtime` module if sum types need runtime type information — defer if complex, document as limitation
