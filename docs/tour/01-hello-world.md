---
title: 01 — Hello world
sidebar_position: 2
description: Write and run your first SuperJS program.
section: tour
---

# Hello world

**Goal:** Run a minimal `.sjs` file with `superjs check`.

SuperJS files use the `.sjs` extension. The compiler type-checks them and emits plain JavaScript.

```bash
superjs check hello.sjs
superjs build hello.sjs --out-dir dist
```

## Example

```sjs
export function greet(name: string): string {
  return "Hello, " + name
}

const msg: string = greet("SuperJS")
console.log(msg)
```

[Open in playground](https://superjs.org/playground#code=ZXhwb3J0IGZ1bmN0aW9uIGdyZWV0KG5hbWU6IHN0cmluZyk6IHN0cmluZyB7CiAgcmV0dXJuICJIZWxsbywgIiArIG5hbWUKfQoKY29uc3QgbXNnOiBzdHJpbmcgPSBncmVldCgiU3VwZXJKUyIpCmNvbnNvbGUubG9nKG1zZyk)

## Key takeaways

- `.sjs` is a typed superset of JavaScript.
- Use `superjs check` before `build`.
- Types are erased at emit — runtime is JS.

**Next:** [Variables and types](./02-variables-and-types.md)
