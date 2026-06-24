---
title: VS Code Marketplace
sidebar_position: 3
description: Publish the SuperJS VS Code extension to the Marketplace (R5).
section: ops
---

# VS Code Marketplace publish

Extension package: `superjs/apps/vscode-extension` (`superjs-syntax`, publisher `hbarve1`).

**RC gate (R5):** co-publisher enrolled before GA publish; rotation documented in `RELEASING.md`.

## Prerequisites

1. [Visual Studio Marketplace publisher account](https://marketplace.visualstudio.com/manage)
2. Personal Access Token with **Marketplace (Publish)** scope
3. `vsce` CLI: `npm install -g @vscode/vsce`
4. Co-publisher account added to the extension publisher (failover per R5)

## Build & test

```bash
cd superjs/apps/vscode-extension
npm ci
npm run compile
npm test
```

Ensure `superjs` is on `PATH` or configure `superjs.lsp.serverPath` — the extension spawns `superjs lsp`.

## Package

```bash
cd superjs/apps/vscode-extension
vsce package
# produces superjs-syntax-<version>.vsix
```

## Publish

```bash
vsce publish -p <AZURE_DEVOPS_PAT>
```

Or upload the `.vsix` manually in the publisher portal.

## Versioning

- Bump `version` in `package.json` + `CHANGELOG.md`
- Align with compiler/LSP capabilities documented in extension README
- Do **not** publish `1.0.0` until maintainer approves RC → GA

## Post-publish

- [ ] Update website [`editors.mdx`](../../superjs/apps/website/content/docs/editors.mdx) with Marketplace install link
- [ ] Verify install on VS Code + Cursor (Open VSX is separate)
- [ ] Smoke: open `.sjs` file, hover, diagnostics

## Open VSX (optional)

Cursor and VSCodium users may need a separate Open VSX publish — track as post-GA if needed.
