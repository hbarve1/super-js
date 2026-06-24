---
title: std-core
sidebar_position: 4
description: "Option and Result, the canonical optional/error types."
section: api
---

# std-core

Option and Result, the canonical optional/error types.

## Types

### `Option`

```sjs
type Option<T> = Some(T) | None
```

`Some(value)` — an optional value is present.

### `Result`

```sjs
type Result<T, E> = Ok(T) | Err(E)
```

`Ok(value)` or `Err(error)` — explicit success/failure without exceptions.

## Functions

### `some`

```sjs
function some<T>(value: T): Option<T>
```

Wrap `value` in `Some`.

### `isSome`

```sjs
function isSome<T>(o: Option<T>): boolean
```

Return `true` when the option is `Some`.

### `unwrapOr`

```sjs
function unwrapOr<T>(o: Option<T>, fallback: T): T
```

Return `value` from `Some`, or `fallback` for `None`.

### `ok`

```sjs
function ok<T, E>(value: T): Result<T, E>
```

Construct `Ok(value)`.

### `err`

```sjs
function err<T, E>(error: E): Result<T, E>
```

Construct `Err(error)`.

### `isOk`

```sjs
function isOk<T, E>(r: Result<T, E>): boolean
```

### `resultOr`

```sjs
function resultOr<T, E>(r: Result<T, E>, fallback: T): T
```
