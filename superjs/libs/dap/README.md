# `@superjs/dap`

Debug Adapter Protocol (DAP) server for SuperJS — **WS-B2 skeleton (Phase 0)**.

## Status

| Phase | Scope | Status |
|-------|--------|--------|
| 0 | DAP handshake, sum-type formatter, `superjs debug`, VS Code contribution | **This PR** |
| 1 | Compile + Node inspector, breakpoints in `.sjs` | Planned |
| 2 | Step + variables with `formatRuntimeValue` | Planned |
| 3 | Evaluate, `launch.json` in `superjs init` | Planned |

## Usage

```bash
superjs debug   # DAP over stdio — VS Code launches this via the extension
```

VS Code `launch.json` (skeleton):

```json
{
  "type": "superjs",
  "request": "launch",
  "name": "Debug SuperJS",
  "program": "${file}",
  "outDir": "${workspaceFolder}/dist"
}
```

Spec: [`specs/roadmap/v1.0/WS-B2-dap.md`](../../../specs/roadmap/v1.0/WS-B2-dap.md)
