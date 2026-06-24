---
title: std-process
sidebar_position: 9
description: "typed access to the process environment."
section: api
---

# std-process

typed access to the process environment.

## Functions

### `args`

```sjs
function args(): string[]
```

### `env`

```sjs
function env(key: string): string?
```

### `cwd`

```sjs
function cwd(): string
```

### `platform`

```sjs
function platform(): string
```

### `exit`

```sjs
function exit(code: number): void
```
