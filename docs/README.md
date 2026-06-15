# docs/ — Agent & Developer Guides

This directory contains end-to-end how-to guides for common development tasks on the SuperJS codebase. These guides are written for both human contributors and AI agents working autonomously.

Start with `specs/mission.md` and the root `CLAUDE.md` for project context, then consult the relevant guide here for the specific task.

---

## Guides

| File | What it covers |
|---|---|
| [howto-add-diagnostic.md](howto-add-diagnostic.md) | Full walkthrough for adding a new `SJS-EXXX` diagnostic code: reserving the number, writing the spec file, emitting in the prototype, writing tests, PR checklist |
| [howto-add-typecheck-rule.md](howto-add-typecheck-rule.md) | How to add a new type-checker lint/warning rule: where rules live in prototype vs compiler, defining the condition, writing the check method, test patterns, making it configurable in `superjs.config.json` |
| [howto-add-language-feature.md](howto-add-language-feature.md) | Checklist for adding a full new language feature end-to-end: grammar, spec file, parser, type-checker, codegen/lowering, golden tests, error codes |

---

## Workspace context files

The compiler and tooling live in the NX monorepo under `superjs/`. Agent context:

| File | Scope |
|---|---|
| [superjs/CLAUDE.md](../superjs/CLAUDE.md) | NX workspace conventions — running tasks via `nx`, generators, plugin docs |
| [superjs/AGENTS.md](../superjs/AGENTS.md) | Agent guide for the workspace |
| [superjs/PROGRESS.md](../superjs/PROGRESS.md) | Implementation log — every lib/app, tier model, decisions |

Each library and app lives under `superjs/libs/<name>/` and `superjs/apps/<name>/` with its own `README.md`.

---

## Quick reference

### Run all tests

```bash
cd superjs
pnpm install
pnpm nx run-many -t test            # every project
pnpm nx test @superjs/checker       # one project
pnpm nx affected -t test            # only what changed
```

### Check what diagnostic codes are available

```
specs/error-codes.md          — registry (canonical)
specs/error-codes/SJS-E*.md   — per-code spec files
```

### Add a new code number

See [howto-add-diagnostic.md](howto-add-diagnostic.md). The next available codes as of this writing are `SJS-E020`, `SJS-W011`, `SJS-L006`.

### Add a new language spec page

1. Pick the next number in `specs/language/README.md`
2. Copy `specs/language/_template.md`
3. Fill in all sections (Syntax, Semantics, Type rules, JS Lowering, LLVM Lowering, Diagnostics, Examples)
4. Add a row to the index in `specs/language/README.md`

### Add a new website doc page

1. Create `superjs/apps/website/content/docs/your-page.mdx` with frontmatter (`title`, `sidebar_position`)
2. Done — routing and nav are automatic
