---
title: 12 — Async and await
sidebar_position: 13
description: async functions and Promise typing.
section: tour
---

# Async and await

**Goal:** Type async workflows with `Promise&lt;T&gt;`.

`async` functions return `Promise&lt;T&gt;` when annotated. Await only inside `async` bodies.

## Example

```sjs
async function fetchText(url: string): Promise<string> {
  const res: dynamic = await fetch(url)
  const text: dynamic = await res.text()
  return text as string
}

async function main(): Promise<void> {
  const body: string = await fetchText("https://example.com")
  console.log(body.length)
}
```

[Open in playground](https://superjs.org/playground#code=YXN5bmMgZnVuY3Rpb24gZmV0Y2hUZXh0KHVybDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc-IHsKICBjb25zdCByZXM6IGR5bmFtaWMgPSBhd2FpdCBmZXRjaCh1cmwpCiAgY29uc3QgdGV4dDogZHluYW1pYyA9IGF3YWl0IHJlcy50ZXh0KCkKICByZXR1cm4gdGV4dCBhcyBzdHJpbmcKfQoKYXN5bmMgZnVuY3Rpb24gbWFpbigpOiBQcm9taXNlPHZvaWQ-IHsKICBjb25zdCBib2R5OiBzdHJpbmcgPSBhd2FpdCBmZXRjaFRleHQoImh0dHBzOi8vZXhhbXBsZS5jb20iKQogIGNvbnNvbGUubG9nKGJvZHkubGVuZ3RoKQp9)

## Key takeaways

- Untyped fetch results start as `dynamic`.
- Narrow or validate before treating as `string`.
- Lint SJS-L015 warns on missing `await` in async paths.

**Next:** [JSX](./13-jsx.md)
