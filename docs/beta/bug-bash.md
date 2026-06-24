---
title: Bug Bash
sidebar_position: 3
description: One-week structured bug bash before RC — scope, labels, and exit criteria.
section: beta
---

# Bug Bash

One structured week of exploratory testing on `superjs@1.0.0-rc.X` before the
final RC tag. Goal: surface `severity=blocker` issues while beta teams are active.

## Schedule (template)

| Day | Focus |
|-----|--------|
| 1 | CLI: `init`, `build`, `check`, `migrate from-prototype` |
| 2 | LSP + VS Code extension on 3 OSes |
| 3 | Playground + tour lesson links |
| 4 | `@superjs/types-*` wrappers + compat matrix spot-check |
| 5 | Triage + fix blockers |

## Reporting

- File issues with repro, expected vs actual, SuperJS version (`superjs --version`).
- Label blockers `severity=blocker`.
- Discussion thread: **Bug bash — v1.0 RC** in GitHub Discussions.

## Exit criteria

- All open `severity=blocker` issues resolved or explicitly deferred with maintainer sign-off.
- No new critical security findings from bash week.

## Owners

Maintainer triages daily; fixes land on `main` and ship in the next `rc.N+1` tag.
