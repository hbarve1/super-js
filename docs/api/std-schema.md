---
title: std-schema
sidebar_position: 10
description: "a small reified Schema&lt;T&gt; validator (M7, MVP)."
section: api
---

# std-schema

a small reified Schema&lt;T&gt; validator (M7, MVP).

## Types

### `Validated`

```sjs
type Validated<T> = Valid(T) | Invalid(string)
```

Outcome of `Schema.parse` — either `Valid(T)` or `Invalid(message)`.

## Classes

### `Schema`

```sjs
class Schema<T>
```

Reified validator with `accepts` and `parse`.

### `Field`

```sjs
class Field
```

## Functions

### `string`

```sjs
function string(): Schema<string>
```

Schema that accepts JavaScript strings.

### `number`

```sjs
function number(): Schema<number>
```

### `boolean`

```sjs
function boolean(): Schema<boolean>
```

### `array`

```sjs
function array<T>(item: Schema<T>): Schema<T[]>
```

### `field`

```sjs
function field(key: string, schema: Schema<dynamic>): Field
```

### `object`

```sjs
function object(fields: Field[]): Schema<dynamic>
```

### `literal`

```sjs
function literal(expected: string): Schema<string>
```

### `optional`

```sjs
function optional<T>(item: Schema<T>): Schema<T?>
```

### `nullable`

```sjs
function nullable<T>(item: Schema<T>): Schema<T?>
```
