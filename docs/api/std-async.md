---
title: std-async
sidebar_position: 2
description: "small async helpers over Promise."
section: api
---

# std-async

small async helpers over Promise.

## Functions

### `sleep`

```sjs
function sleep(ms: number): Promise<void>
```

### `delayValue`

```sjs
async function delayValue<T>(value: T, ms: number): Promise<T>
```
