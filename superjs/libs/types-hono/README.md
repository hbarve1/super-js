# @superjs/types-hono

Typed SuperJS bindings for [`hono`](https://www.npmjs.com/package/hono) 4.x.

## Install

```bash
pnpm add hono @superjs/types-hono
```

## Usage

```sjs
import createApp from "hono"
import type { Hono } from "@superjs/types-hono"

let app: dynamic = createApp()
```

See [STATUS.md](./STATUS.md) for coverage and known gaps.
