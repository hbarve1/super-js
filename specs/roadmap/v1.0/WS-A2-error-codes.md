# WS-A2: Error-code reference pages

**Branch:** `feature/v1.0-error-codes`  
**Effort:** medium  
**Deps:** none — start immediately  
**PR base:** `main`

## Objective

Every diagnostic code emitted by the compiler, linter, and parser must have a corresponding
`specs/error-codes/SJS-XXXX.md` page. Add a CI gate that enforces this.

## Context

- Error-code registry: `specs/error-codes.md` — source of truth for all codes + descriptions
- Existing pages: `specs/error-codes/` — 42 files present
- Page format: see `specs/error-codes/SJS-E001.md` and `SJS-L001.md` as canonical examples
- Lint rule source: `superjs/libs/compiler/src/lib/lint.ts` — comments at top describe each rule
- Checker source: `superjs/libs/compiler/src/lib/checker.ts` — `SJS-E*` codes
- Parser source: `superjs/libs/compiler/src/lib/parser.ts` — `SJS-P*` codes

## Missing pages (13 total)

### Type error codes

| Code | Short message | Source |
|------|--------------|--------|
| SJS-E020 | Ambiguous variant constructor — multiple sum types declare it | checker |

### Lint codes

| Code | Rule name | Description |
|------|-----------|-------------|
| SJS-L006 | no-empty-match | `match` expression with no arms |
| SJS-L007 | no-redundant-match-arm | arm whose variant is already covered by an earlier arm |
| SJS-L008 | prefer-arrow-callback | anonymous `function` expression passed as a callback argument |
| SJS-L009 | no-unused-import | import binding never referenced in the file |
| SJS-L010 | import-order | imports not sorted in ascending source-path order within a contiguous block |
| SJS-L012 | no-unused-var | non-exported top-level binding (`const`/`let`/function/class) never used |
| SJS-L013 | no-explicit-dynamic | explicit `dynamic` type annotation (add `@sjs:dynamic-ok` comment to opt out) |
| SJS-L014 | no-shadowing | binding whose name shadows a name from an enclosing scope |
| SJS-L015 | no-floating-promise | `Promise`-typed expression used as an `ExpressionStatement` (fire-and-forget) |
| SJS-L016 | no-unhandled-result | `Result`-typed expression used as an `ExpressionStatement` |
| SJS-L017 | prefer-result-over-throw | `throw` statement — SJS favours returning `Result` |
| SJS-L018 | no-mixed-spaces-tabs | line whose leading indentation mixes spaces and tabs |

## Page format (copy from SJS-E001.md / SJS-L001.md)

```markdown
# SJS-XXXX — Short message

**Severity:** error | warning  
**Category:** <category>  
**Stage:** Stage N

## Description

[2–4 sentences explaining what triggers this, why it matters]

## Example

```sjs
// ✗ error/lint warning
<bad code>   // SJS-XXXX
```

## Fix

[1–2 sentences]

```sjs
// ✓ correct
<good code>
```

## Auto-fix   ← only if auto-fixable

This diagnostic is **auto-fixable**. Running `superjs fix` ...

## Configuration   ← only for lint codes

```json
{
  "lint": {
    "LNNN": "error" | "warn" | "off"
  }
}
```

Default: `"warn"` | `"error"` in `--strict` mode.

## Related codes

- `SJS-XXXX` — ...
```

## CI gate

Add `scripts/check-error-pages.ts` (TypeScript, run via `tsx`):

```typescript
// scripts/check-error-pages.ts
import { readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

// 1. Grep all SJS-[EPLW][0-9]{3} codes from compiler source
const emitted = new Set<string>();
const output = execSync(
  `grep -roh "SJS-[EPLW][0-9]\\{3\\}" superjs/libs --include="*.ts"`,
  { encoding: 'utf8' }
);
output.trim().split('\n').filter(Boolean).forEach(c => emitted.add(c.trim()));

// 2. List existing pages
const existing = new Set(
  readdirSync('specs/error-codes')
    .filter(f => f.match(/^SJS-[EPLW]\d{3}\.md$/))
    .map(f => f.replace('.md', ''))
);

// 3. Find missing
const missing = [...emitted].filter(c => !existing.has(c)).sort();
if (missing.length > 0) {
  console.error('Missing error-code pages:', missing.join(', '));
  process.exit(1);
}
console.log(`All ${emitted.size} error codes have pages.`);
```

Add to `.github/workflows/ci.yml` under the `lint` job (or new `error-pages` job):

```yaml
- name: Check error-code pages
  run: npx tsx scripts/check-error-pages.ts
```

Add to `package.json` root scripts:
```json
"check:error-pages": "tsx scripts/check-error-pages.ts"
```

## Implementation steps

1. Read `specs/error-codes/SJS-E001.md` and `specs/error-codes/SJS-L001.md` — understand format.
2. Read `superjs/libs/compiler/src/lib/lint.ts` top comment — each rule described there.
3. Read `superjs/libs/compiler/src/lib/checker.ts` — find E020 emission context.
4. Write one `.md` file per missing code in `specs/error-codes/`.
5. Create `scripts/check-error-pages.ts`.
6. Run `npx tsx scripts/check-error-pages.ts` — must exit 0.
7. Add CI step to `.github/workflows/ci.yml`.
8. PR: `specs/error-codes/SJS-E020.md` + 12 L-pages + script + CI step.

## Acceptance criteria

- [ ] `specs/error-codes/SJS-E020.md` exists and matches registry description
- [ ] `specs/error-codes/SJS-L006.md` through `SJS-L010.md` exist (5 files)
- [ ] `specs/error-codes/SJS-L012.md` through `SJS-L018.md` exist (7 files)
- [ ] All pages follow the established format (Description / Example / Fix / Config / Related)
- [ ] `scripts/check-error-pages.ts` exists and exits 0
- [ ] CI job `check-error-pages` added to `.github/workflows/ci.yml`
- [ ] `npx tsx scripts/check-error-pages.ts` green locally

## Notes

- L011 is intentionally skipped in the registry (reserved/retired) — do NOT create SJS-L011 if it already exists; check first
- E404 and E999 appear only in `test-utils.spec.ts` as test sentinels — NOT real emitted codes, do NOT create pages for them
- Check `specs/error-codes/README.md` for any naming conventions before writing
