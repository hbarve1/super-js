# @superjs/types-koa

Typed SuperJS bindings for [`koa`](https://www.npmjs.com/package/koa) 2.x.

## Install

```bash
pnpm add koa @superjs/types-koa
```

## Usage

```sjs
import createApp from "koa"
import type { Application } from "@superjs/types-koa"

let app: dynamic = createApp()
```

See [STATUS.md](./STATUS.md) for coverage and known gaps.
