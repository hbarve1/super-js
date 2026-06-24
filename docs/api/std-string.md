---
title: std-string
sidebar_position: 11
description: "string helpers (thin, total wrappers over JS string ops)."
section: api
---

# std-string

string helpers (thin, total wrappers over JS string ops).

## Functions

### `trim`

```sjs
function trim(s: string): string
```

Remove leading and trailing whitespace.

### `lower`

```sjs
function lower(s: string): string
```

### `upper`

```sjs
function upper(s: string): string
```

### `split`

```sjs
function split(s: string, sep: string): string[]
```

### `join`

```sjs
function join(parts: string[], sep: string): string
```

### `includes`

```sjs
function includes(s: string, needle: string): boolean
```

### `startsWith`

```sjs
function startsWith(s: string, prefix: string): boolean
```

### `endsWith`

```sjs
function endsWith(s: string, suffix: string): boolean
```

### `replace`

```sjs
function replace(s: string, target: string, replacement: string): string
```
