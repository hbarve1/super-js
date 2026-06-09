# Source-Map Fidelity Specification

**Referenced by:** `specs/roadmap/stage-1-compiler-core.md` §Sprint 1.4 (M5)  
**Exit criterion:** fidelity score ≥ 0.85 average on the 100-frame corpus  
**CI step:** `npm run check:sourcemap-fidelity`

---

## What Source-Map Fidelity Means

When the SuperJS compiler emits ES2022 JavaScript it also emits a [Source Map v3][sm-spec]
(`.js.map`) that maps positions in the generated output back to the original `.sjs` source.
Developer tools (Node `--enable-source-maps`, Chrome DevTools, VS Code debugger) use this map
to display `.sjs` file names, line numbers, and symbol names in stack traces, breakpoints, and
error messages.

**Source-map fidelity** is a quantitative measure of how accurately the emitted map reflects
the original source. A fidelity score of 1.0 means every sampled frame is perfectly mapped; a
score of 0.0 means no frames are mapped at all. The scoring formula below captures three
distinct dimensions of mapping quality:

| Dimension | Weight | What it measures |
|---|---|---|
| Correct line | 1.0 | The mapped line number matches the original `.sjs` source line |
| Correct column | 0.5 | The mapped column number is within ±1 of the original column |
| Name present | 0.3 | The `names` field of the source map carries the original symbol name for this frame |

A "frame" is a single stack-frame entry produced by running a compiled `.sjs` fixture under
`node --enable-source-maps` and capturing the resolved source position reported by V8.

---

## Scoring Formula

```
score(corpus) = sum_over_frames(
    correct_line(frame)
  + 0.5 × correct_col(frame)
  + 0.3 × names_present(frame)
) / frame_count
```

Where:

- `correct_line(frame)` is `1` if the line reported by the source map equals the expected
  `.sjs` line in the fixture's assertion file, `0` otherwise.
- `correct_col(frame)` is `1` if `abs(reported_col − expected_col) ≤ 1`, `0` otherwise.
  A tolerance of ±1 column is permitted because some transforms insert or remove a single
  whitespace character at statement boundaries.
- `names_present(frame)` is `1` if the source map's `names` entry for this mapping is
  non-empty, `0` otherwise. This does not assert that the name is *correct* — only that a
  name was emitted. Name correctness is checked separately by the `typedecl-roundtrip` corpus.

The maximum raw score per frame is `1.0 + 0.5 + 0.3 = 1.8`; normalising by `frame_count`
gives an average in the range `[0, 1.8]`. The **pass threshold is ≥ 0.85**, which corresponds
roughly to "all lines correct, roughly half the columns correct, names present on about a third
of frames" — a conservative baseline for a first-generation codegen.

---

## Test Corpus Structure

The corpus lives at `tests/fixtures/source-maps/` and consists of exactly **100 frames**
spread across **30 input fixture files**. Each fixture file is an independent `.sjs` program
that, when compiled and run under Node, produces a predictable stack trace.

### Directory layout

```
tests/fixtures/source-maps/
├── 001-simple-function/
│   ├── input.sjs          # Source SJS file
│   ├── expected-frames.json  # Assertion file — see schema below
│   └── runner.js          # Node entry point that triggers the stack frames
├── 002-class-method/
│   └── ...
├── ...
├── 030-three-await-chain/
│   └── ...
```

### `expected-frames.json` schema

```json
{
  "frames": [
    {
      "id": "unique-frame-id",
      "description": "Human-readable description of this frame",
      "expectedFile": "input.sjs",
      "expectedLine": 12,
      "expectedCol": 5,
      "expectName": true
    }
  ]
}
```

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable identifier used in CI output to pinpoint regressions |
| `description` | string | Human-readable context for reviewers |
| `expectedFile` | string | The `.sjs` source file the frame should map back to |
| `expectedLine` | number | 1-based line number in `expectedFile` |
| `expectedCol` | number | 1-based column number in `expectedFile` |
| `expectName` | boolean | Whether the `names` entry should be non-empty for this frame |

### Corpus composition

| Category | Fixture count | Frame count |
|---|---|---|
| Synchronous functions and method calls | 8 | 28 |
| Arrow functions and closures | 4 | 12 |
| Class constructors and methods | 4 | 10 |
| `async`/`await` chains (≥ 3 await boundaries) | 6 | 30 |
| Sum-type `match` expressions | 4 | 12 |
| Generic functions | 4 | 8 |
| **Total** | **30** | **100** |

The **30 async-await frames** are specifically required by exit criterion T4 of Stage 1 Sprint
1.6: a fixture must throw an error across three `await` boundaries and the resulting stack
(rendered by `node --enable-source-maps`) must contain three distinct `.sjs` frames with
correct file names and line numbers.

---

## What "Correct" Means per Dimension

### Correct line

A frame's line is considered correct if the source-map lookup for the generated output position
resolves to the same 1-based line number as recorded in `expectedLine`. Off-by-one errors
(e.g. mapping to the line *above* a statement rather than the statement itself) count as
incorrect. The check is strict because IDEs use line numbers for breakpoints — an off-by-one
means a breakpoint lands on the wrong statement.

### Correct column

A frame's column is considered correct if the absolute difference between the resolved column
and `expectedCol` is at most 1. A tolerance of ±1 is allowed because:

- Some statement transformations (e.g. wrapping a sum-type variant call in `{ _tag, _0 }`)
  insert a leading `{` that shifts all subsequent tokens by one column.
- The ES2022 spec allows line-ending normalisation that may shift column positions by one.

Column accuracy is weighted at 0.5 (half the weight of line accuracy) because correct line
numbers are the most important property for debugger step-through behaviour.

### Names present

The `names` array in a Source Map v3 document carries the original symbol names at each
mapping segment. A mapping that resolves to a named entry allows debuggers and stack-trace
renderers to show the original SJS symbol name rather than a mangled or inlined name. The
fidelity check does not validate that the recorded name matches the identifier in the source;
it only checks presence. Full name correctness is validated by the `typeAt` smoke tests in
Sprint 1.6.

---

## Running the Fidelity Check

```sh
# Run the full fidelity check against the 100-frame corpus
npm run check:sourcemap-fidelity

# Run against a single fixture directory
npm run check:sourcemap-fidelity -- --fixture tests/fixtures/source-maps/030-three-await-chain

# Output a JSON report (consumed by the CI dashboard)
npm run check:sourcemap-fidelity -- --format json > .sourcemap-fidelity-report.json
```

The check script (`scripts/check-sourcemap-fidelity.mjs`):

1. Compiles each fixture's `input.sjs` via `packages/compiler` (`compile()` API).
2. Runs the compiled output under `node --enable-source-maps`, capturing the stack trace via
   `Error.captureStackTrace`.
3. For each expected frame in `expected-frames.json`, resolves the reported V8 source position
   through the emitted `.js.map` using the `source-map` npm package.
4. Computes the per-frame score components and accumulates the corpus total.
5. Exits with code `0` if `corpus_score / frame_count ≥ 0.85`, `1` otherwise.
6. Prints a per-fixture breakdown when `--verbose` is passed.

### CI integration

The `check:sourcemap-fidelity` step runs in the **Sprint 1.4 done-signal PR** and on every
subsequent PR that touches `packages/compiler/src/codegen/` or `tests/fixtures/source-maps/`.
A failing score blocks the PR merge.

---

## Relationship to Other Specs

| Spec | Relationship |
|---|---|
| `specs/roadmap/stage-1-compiler-core.md` | Defines the ≥ 0.85 exit criterion (M5) and references this spec |
| `specs/parser-recovery.md` | Source positions emitted during recovery contribute to the corpus |
| `specs/error-codes/SJS-P001.md` – `SJS-P099.md` | Parser errors carry `SourceSpan`; their accuracy is part of the broader fidelity story |
| `packages/compiler/src/cache/hashing.md` | Cache key covers source-map mode; mode changes invalidate cached maps |

[sm-spec]: https://sourcemaps.info/spec.html
