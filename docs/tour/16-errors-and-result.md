---
title: 16 — Errors and Result
sidebar_position: 17
description: Chain Results instead of throwing.
section: tour
---

# Errors and Result

**Goal:** Propagate failures explicitly through call stacks.

Unexpected bugs may still throw at runtime, but expected failures belong in `Result`.

## Example

```sjs
type Result<T, E> = Ok(T) | Err(E)

function step1(): Result<number, string> {
  return Ok(2)
}

function step2(n: number): Result<number, string> {
  if (n < 0) return Err("negative")
  return Ok(n * 10)
}

function pipeline(): Result<number, string> {
  const a: Result<number, string> = step1()
  return match a {
    Ok(n) => step2(n),
    Err(e) => Err(e),
  }
}
```

[Open in playground](https://superjs.org/playground#code=dHlwZSBSZXN1bHQ8VCwgRT4gPSBPayhUKSB8IEVycihFKQoKZnVuY3Rpb24gc3RlcDEoKTogUmVzdWx0PG51bWJlciwgc3RyaW5nPiB7CiAgcmV0dXJuIE9rKDIpCn0KCmZ1bmN0aW9uIHN0ZXAyKG46IG51bWJlcik6IFJlc3VsdDxudW1iZXIsIHN0cmluZz4gewogIGlmIChuIDwgMCkgcmV0dXJuIEVycigibmVnYXRpdmUiKQogIHJldHVybiBPayhuICogMTApCn0KCmZ1bmN0aW9uIHBpcGVsaW5lKCk6IFJlc3VsdDxudW1iZXIsIHN0cmluZz4gewogIGNvbnN0IGE6IFJlc3VsdDxudW1iZXIsIHN0cmluZz4gPSBzdGVwMSgpCiAgcmV0dXJuIG1hdGNoIGEgewogICAgT2sobikgPT4gc3RlcDIobiksCiAgICBFcnIoZSkgPT4gRXJyKGUpLAogIH0KfQ)

## Key takeaways

- Callers must handle `Err` — the type system enforces it.
- Combine steps with `match` or helper functions.
- See [migration guide](../migration/02-idioms.md).

**Next:** [Iterators and for...of](./17-iterators-and-for-of.md)
