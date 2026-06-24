---
title: std-math
sidebar_position: 7
description: "numeric helpers over the JS Math global."
section: api
---

# std-math

numeric helpers over the JS Math global.

## Functions

### `abs`

```sjs
function abs(x: number): number
```

Absolute value (sign stripped).

### `sign`

```sjs
function sign(x: number): number
```

### `min`

```sjs
function min(a: number, b: number): number
```

### `max`

```sjs
function max(a: number, b: number): number
```

### `clamp`

```sjs
function clamp(x: number, lo: number, hi: number): number
```

Clamp `x` to the inclusive range `[lo, hi]`.

### `lerp`

```sjs
function lerp(a: number, b: number, t: number): number
```

### `floor`

```sjs
function floor(x: number): number
```

### `ceil`

```sjs
function ceil(x: number): number
```

### `round`

```sjs
function round(x: number): number
```

### `sqrt`

```sjs
function sqrt(x: number): number
```

### `pow`

```sjs
function pow(base: number, exp: number): number
```

## Constants

### `PI`

```sjs
const PI: number
```

Ratio of a circle's circumference to its diameter.

### `E`

```sjs
const E: number
```

Euler's number.
