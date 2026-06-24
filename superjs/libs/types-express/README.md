# @superjs/types-express

Typed SuperJS bindings for [`express`](https://www.npmjs.com/package/express) 4.x.

## Install

```bash
pnpm add express @superjs/types-express
```

## Usage

```sjs
import createApp from "express"
import type { Application } from "@superjs/types-express"

let app: dynamic = createApp()
```

See [STATUS.md](./STATUS.md) for coverage and known gaps.
