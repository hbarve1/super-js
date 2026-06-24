---
title: std-fs
sidebar_position: 5
description: "Result-returning wrappers over Node's synchronous fs."
section: api
---

# std-fs

Result-returning wrappers over Node's synchronous fs.

## Types

### `FsResult`

```sjs
type FsResult<T> = FsOk(T) | FsErr(string)
```

## Functions

### `readText`

```sjs
function readText(path: string): FsResult<string>
```

### `writeText`

```sjs
function writeText(path: string, data: string): FsResult<boolean>
```

### `exists`

```sjs
function exists(path: string): boolean
```
