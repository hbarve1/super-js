# Node.js Integration

SJS modules for file I/O, static analysis, and server-side code. These examples show how to write SJS that interoperates with Node.js built-ins and third-party packages.

## Files

| File | Description |
|------|-------------|
| `src/analyzer.sjs` | Code statistics analyzer — walks a directory tree and aggregates line counts, comment ratios, and file sizes per extension |

## Key patterns

- Node.js imports use standard `import fs from 'fs'` syntax
- Errors from Node APIs are wrapped with `catch (e: dynamic)` (never bare `catch`)
- Sum types use the `| Variant` prefix form: `type AnalysisResult<T> = | Success(T) | Failure(string)`
- Results bubble up via return values rather than thrown exceptions

## Running the example

```bash
superjs build --source node/src/analyzer.sjs --outDir /tmp/out && node /tmp/out/analyzer.js
```

To analyze a specific directory, import `analyzeDirectory` from the compiled output:

```js
const { analyzeDirectory } = require('/tmp/out/analyzer.js')
console.log(analyzeDirectory('./src', ['.sjs', '.ts']))
```
