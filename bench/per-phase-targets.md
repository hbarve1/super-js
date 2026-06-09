# Per-Phase Performance Targets

> **Stage 1 Sprint 1.1 deliverable (S6).** These targets are binding: CI enforces
> per-sprint regression checks on every done-signal PR. Missing a target is a
> sprint blocker unless explicitly accepted with a documented justification.

---

## Targets

| Phase | Metric | Minimum target | Hard-fail threshold | Soft-fail threshold |
|-------|--------|---------------|---------------------|---------------------|
| Lexer | tokens/sec (cold, single-thread) | **≥ 500 000** | < 375 000 (−25 %) | < 450 000 (−10 %) |
| Parser | AST-nodes/sec | **≥ 200 000** | < 150 000 (−25 %) | < 180 000 (−10 %) |
| Type-checker | constraints/sec | **≥ 50 000** | < 37 500 (−25 %) | < 45 000 (−10 %) |
| Codegen | AST-nodes/sec | **≥ 100 000** | < 75 000 (−25 %) | < 90 000 (−10 %) |
| Aggregate cold compile | ms for 10 k LOC | **≤ 2 000 ms** | > 2 500 ms (+25 %) | > 2 200 ms (+10 %) |

The soft-fail and hard-fail thresholds are computed relative to the current
`bench/baseline.json`, not relative to the minimum target. A phase can exceed its
minimum target in the baseline; regression is measured from baseline, not from minimum.

---

## CI Regression Policy

Regression is computed as:

```
regression_pct = (baseline_hz - current_hz) / baseline_hz * 100
```

For the aggregate cold-compile benchmark (where lower is better):

```
regression_pct = (current_ms - baseline_ms) / baseline_ms * 100
```

- **+10 % regression (soft-fail):** CI emits a warning annotation on the PR. Merge is allowed. The annotation persists in the PR check summary as a visible signal.
- **+25 % regression (hard-fail):** CI fails with exit code 1. The PR is blocked. The author must either fix the regression or open a follow-up issue, update `bench/baseline.json` with the new numbers, and add a PR comment explaining the intentional change.

This policy applies to **every sprint's done-signal PR** from Sprint 1.1 onward, not only the final Sprint 1.6 hard determinism gate.

---

## How to Measure Each Phase

### Lexer — tokens/sec

**tinybench setup:**

```ts
import { bench, run } from 'tinybench';
import { createLexer } from '@superjs/compiler/lexer';
import { readFileSync } from 'node:fs';

const source = readFileSync('tests/fixtures/bench/10k-loc.sjs', 'utf8');

bench('lexer', () => {
  const lexer = createLexer(source, '10k-loc.sjs');
  while (lexer.nextToken().kind !== 'eof') { /* drain */ }
}, { iterations: 50 });

await run();
```

**Fixture:** `tests/fixtures/bench/10k-loc.sjs` (10 000 lines, ~320 000 tokens).

**What is counted:** every call to `nextToken()` that returns a non-trivia token. Trivia (comments, whitespace) tokens are included in the token count for the purposes of this benchmark because the lexer must process them to maintain correct spans.

**Cold vs warm:** the `bench` call runs the lexer from scratch on each iteration (the source string is pre-loaded into memory; "cold" means no lexer state is reused between iterations).

---

### Parser — AST-nodes/sec

**tinybench setup:**

```ts
import { bench, run } from 'tinybench';
import { createLexer } from '@superjs/compiler/lexer';
import { createParser } from '@superjs/compiler/parser';
import { readFileSync } from 'node:fs';

const source = readFileSync('tests/fixtures/bench/10k-loc.sjs', 'utf8');

bench('parser', () => {
  const lexer = createLexer(source, '10k-loc.sjs');
  const parser = createParser(lexer);
  parser.parseModule(); // returns the root AstNode
}, { iterations: 20 });

await run();
```

**What is counted:** total `AstNode` objects created during `parseModule()`. The fixture generator records the expected node count at generation time and embeds it in a header comment; the benchmark reads this to compute nodes/sec.

---

### Type-checker — constraints/sec

**tinybench setup:**

```ts
import { bench, run } from 'tinybench';
import { createChecker } from '@superjs/compiler/checker';
// `ast` is the pre-parsed module AST (parsed once outside the bench loop)

bench('type-checker', () => {
  const checker = createChecker({ modules: [ast] });
  checker.check(); // returns Diagnostic[]
}, { iterations: 10 });

await run();
```

**What is counted:** total type-constraint solve operations. The checker exposes a `constraintCount()` accessor that returns the number of constraints processed in the last `check()` call; `hz × constraintCount()` gives constraints/sec.

**Note:** the AST is parsed once before the bench loop (not included in the timing) to isolate checker performance from parser performance.

---

### Codegen — AST-nodes/sec

**tinybench setup:**

```ts
import { bench, run } from 'tinybench';
import { createCodegen } from '@superjs/compiler/codegen';
// `checkedAst` is the type-annotated AST produced by the checker (computed once)

bench('codegen', () => {
  const gen = createCodegen({ ast: checkedAst });
  gen.emit(); // returns { code: string, map: string }
}, { iterations: 20 });

await run();
```

**What is counted:** total `AstNode` visits during `emit()`. The codegen exposes a `visitCount()` accessor analogous to `constraintCount()`.

---

### Aggregate Cold Compile — ms for 10 k LOC

**tinybench setup:**

```ts
import { bench, run } from 'tinybench';
import { compile } from '@superjs/compiler';
import { readFileSync } from 'node:fs';

const source = readFileSync('tests/fixtures/bench/10k-loc.sjs', 'utf8');

bench('cold-compile-10kloc', async () => {
  await compile({ files: [{ path: '10k-loc.sjs', source }] });
}, { iterations: 10 });

await run();
```

**What is measured:** wall-clock time from `compile()` call to resolved Promise, including all phases (lex → parse → check → codegen) with no warm caches. The `mean` field in tinybench output (in seconds) is multiplied by 1 000 to get milliseconds.

**Machine reference:** targets are calibrated for a 4-core 3 GHz machine (M-series or x86_64). CI runners are documented in `.github/workflows/ci.yml`; if CI hardware differs significantly from this reference, the baseline is adjusted accordingly at the start of Sprint 1.1.

---

## Baseline Recording Procedure

Record a new baseline after any sprint where performance characteristics intentionally change:

1. **Ensure a quiet machine:** close background apps; disconnect from VPN if it adds scheduling jitter.
2. **Run the full benchmark suite three times** and take the median `hz` / `mean` values:
   ```bash
   npm run bench -- --json | tee /tmp/bench-run1.json
   npm run bench -- --json | tee /tmp/bench-run2.json
   npm run bench -- --json | tee /tmp/bench-run3.json
   # Then pick the median run (compare .hz fields) and copy to bench/baseline.json
   ```
3. **Set `recorded`** to today's ISO date and **`compiler_version`** to the current package version from `packages/compiler/package.json`.
4. **Set `platform`** to `node -e "console.log(process.platform + '-' + process.arch)"`.
5. **Commit `bench/baseline.json`** with a message explaining why the baseline was updated:
   ```bash
   git add bench/baseline.json
   git commit -m "bench: record Sprint X.Y baseline (lexer optimisation, +12 % tokens/sec)"
   ```
6. **Include the commit in the sprint's done-signal PR.** CI will use the new baseline going forward.
