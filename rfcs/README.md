# RFC Process

SuperJS uses RFCs (Request for Comments) for language changes and major API decisions.

## When to write an RFC

- New language syntax
- Semantic changes to existing constructs
- Major CLI changes
- Stability tier changes

## Template

RFCs live in `rfcs/NNNN-short-title.md`. Use this structure:

```markdown
---
rfc: NNNN
title: Short title
status: draft | accepted | rejected | superseded
author: @handle
date: YYYY-MM-DD
---

# RFC-NNNN: Title

## Summary
## Motivation
## Design
## Drawbacks
## Alternatives
## Unresolved questions
```

## Process

1. Open a PR adding `NNNN-title.md` (pick the next available number).
2. Discussion happens on the PR.
3. RFC is merged as **accepted** or **rejected** (rejected RFCs are kept for historical record).
4. Accepted RFCs are implemented in the referenced stage.

## Status tags

`[draft]` `[accepted]` `[rejected]` `[superseded by RFC-NNNN]`

## Index

| RFC | Title | Status |
|-----|-------|--------|
| [0001](0001-no-any-introduce-dynamic.md) | No `any` — introduce `dynamic` | accepted |
| [0002](0002-ban-complex-types.md) | Ban complex types | accepted |
| [0003](0003-sum-type-tag-representation.md) | Sum-type runtime encoding (`{_tag, _0}`) | accepted |
| [0004](0004-result-canonical-error.md) | Result as canonical error model | accepted |
| [0005](0005-defer-editions.md) | Defer language editions | accepted |

RFCs 0001–0005 were filed retroactively in Stage 0; they record decisions already shipped in the compiler.
