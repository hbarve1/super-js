---
title: std-json
sidebar_position: 6
description: "Result-returning JSON parse/stringify."
section: api
---

# std-json

Result-returning JSON parse/stringify.

## Types

### `JsonResult`

```sjs
type JsonResult<T> = JsonOk(T) | JsonErr(string)
```

## Functions

### `parse`

```sjs
function parse(text: string): JsonResult<dynamic>
```

### `stringify`

```sjs
function stringify(value: dynamic): string
```

### `stringifyPretty`

```sjs
function stringifyPretty(value: dynamic, indent: number): string
```
