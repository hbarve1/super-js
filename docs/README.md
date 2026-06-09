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

## Package-level context files

Each package has a `CLAUDE.md` with package-specific context for agents:

| File | Package |
|---|---|
| [compiler/CLAUDE.md](../compiler/CLAUDE.md) | Phase 2 plain-JS compiler — directory layout, how to add rules, how to run tests, key invariants |
| [backends/prototype/CLAUDE.md](../backends/prototype/CLAUDE.md) | Phase 1 Babel-based prototype — directory layout, TypeChecker internals, how to add diagnostics, test patterns |
| [website/CLAUDE.md](../website/CLAUDE.md) | Next.js marketing/docs site — directory layout, how to add doc pages, how to run locally, what not to change |

---

## Quick reference

### Run all tests

```bash
# Prototype
cd backends/prototype && npm test

# Compiler
cd compiler && npm test
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

1. Create `website/content/docs/your-page.mdx` with frontmatter (`title`, `sidebar_position`)
2. Done — routing and nav are automatic

See [website/CLAUDE.md](../website/CLAUDE.md) for details.
