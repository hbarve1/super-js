# @superjs/types-fastify

Typed SuperJS bindings for [`fastify`](https://www.npmjs.com/package/fastify) 4.x.

## Install

```bash
pnpm add fastify @superjs/types-fastify
```

## Usage

```sjs
import createApp from "fastify"
import type { FastifyInstance } from "@superjs/types-fastify"

let app: dynamic = createApp()
```

See [STATUS.md](./STATUS.md) for coverage and known gaps.
