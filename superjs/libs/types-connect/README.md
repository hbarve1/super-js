# @superjs/types-connect

Typed SuperJS bindings for [`connect`](https://www.npmjs.com/package/connect) 3.x.

## Install

```bash
pnpm add connect @superjs/types-connect
```

## Usage

```sjs
import createApp from "connect"
import type { Server } from "@superjs/types-connect"

let app: dynamic = createApp()
```

See [STATUS.md](./STATUS.md) for coverage and known gaps.
