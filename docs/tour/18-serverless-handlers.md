---
title: 18 — Serverless handlers
sidebar_position: 19
description: Workers and Lambda handler patterns.
section: tour
---

# Serverless handlers

**Goal:** Structure edge and serverless entrypoints in SJS.

Scaffold templates with `superjs init workers-api` or `lambda-handler`.
For a full Node backend, see [mvb-fastify](../../examples/mvb-fastify/).

## Example

```sjs
export async function fetch(request: dynamic): Promise<dynamic> {
  const url: dynamic = new URL(request.url as string)
  const path: string = url.pathname as string
  if (path === "/health") {
    return new Response("ok", { status: 200 })
  }
  return new Response("not found", { status: 404 })
}
```

[Open in playground](https://superjs.org/playground#code=ZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoKHJlcXVlc3Q6IGR5bmFtaWMpOiBQcm9taXNlPGR5bmFtaWM-IHsKICBjb25zdCB1cmw6IGR5bmFtaWMgPSBuZXcgVVJMKHJlcXVlc3QudXJsIGFzIHN0cmluZykKICBjb25zdCBwYXRoOiBzdHJpbmcgPSB1cmwucGF0aG5hbWUgYXMgc3RyaW5nCiAgaWYgKHBhdGggPT09ICIvaGVhbHRoIikgewogICAgcmV0dXJuIG5ldyBSZXNwb25zZSgib2siLCB7IHN0YXR1czogMjAwIH0pCiAgfQogIHJldHVybiBuZXcgUmVzcG9uc2UoIm5vdCBmb3VuZCIsIHsgc3RhdHVzOiA0MDQgfSkKfQ)

## Key takeaways

- Handlers take `dynamic` at the platform boundary.
- Use `match` on paths and event shapes.
- Not decorators — serverless export handlers only.

**Next:** [Tooling tour](./19-tooling-tour.md)
