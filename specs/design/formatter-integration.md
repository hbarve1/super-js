# Formatter integration & coexistence (C1)

How `superjs format` lives alongside `.sjsignore`, Prettier, and a Git pre-commit
hook. The formatter is **safe by construction** — it re-parses its own output and
only rewrites a file when the result is provably the same program — so the only
coexistence concern is *which tool owns which files*, not corruption.

## `.sjsignore`

`superjs format`, `lint`, `check`, `build`, and `doc` honour a gitignore-style
`.sjsignore` at the project root. It applies to files discovered by **directory
expansion**; an explicitly-named file argument is always processed.

Supported syntax (a subset of gitignore):

- `#` comments and blank lines are ignored.
- `name` — matches `name` at any depth (a path segment or file).
- `dir/` — a trailing slash marks a directory; its contents are excluded.
- `/anchored` — a leading slash anchors the pattern to the project root.
- `*` (within a path segment), `**` (across segments), and `?` wildcards.
- `!pattern` — re-includes a previously-excluded path; later rules win.

```gitignore
# generated code — never format or lint these
*.gen.sjs
/vendor/
node_modules/

# …except this one
!vendor/keep.sjs
```

## Prettier

Prettier has no `.sjs` parser, so the two never fight over the same files:

- Keep `.sjs` out of Prettier's scope — add `*.sjs` to `.prettierignore`.
- Let `superjs format` own `.sjs`; let Prettier own `.ts`, `.json`, `.md`, etc.
- There is no SuperJS Prettier plugin at v1.0; the canonical formatter is the
  CLI (one style, no options to configure).

## Git pre-commit hook (Husky)

Format and lint staged `.sjs` files before they land. With Husky + lint-staged:

```jsonc
// package.json
{
  "lint-staged": {
    "*.sjs": ["superjs format", "superjs lint"]
  }
}
```

```sh
# .husky/pre-commit
npx lint-staged
```

`superjs format` writes in place (no `--check`); `superjs lint` exits non-zero on
findings, so the commit is blocked until they are resolved. In CI, prefer
`superjs format <dir> --check` (writes nothing, non-zero exit if anything would
change) so formatting drift fails the build without mutating the checkout.

## Idempotency invariant

`format(format(x)) === format(x)` for every input. The formatter's second pass
reports `changed: false`. This is enforced by the corpus-idempotence tests in
`libs/compiler/src/lib/format.spec.ts`, which run every example through the
formatter twice and assert the output is stable.
