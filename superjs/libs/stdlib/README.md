# @superjs/stdlib

The SuperJS standard library, **written in SJS** (`src/modules/*.sjs`) and compiled
by the SuperJS compiler. These map to the published `@superjs/std-*` packages
(Layer-1/2 of the roadmap). A spec compiles every module (asserting zero errors +
emit) and a runtime spec imports the emitted JS to assert real behaviour.

## Modules

| Module | Surface |
|--------|---------|
| `std-core` | `Option<T>`, `Result<T,E>` + `some`/`isSome`/`unwrapOr`/`ok`/`err`/`isOk`/`resultOr` |
| `std-math` | `PI`/`E` + `abs`/`sign`/`min`/`max`/`clamp`/`lerp`/`floor`/`ceil`/`round`/`sqrt`/`pow` |
| `std-string` | `trim`/`lower`/`upper`/`split`/`join`/`includes`/`startsWith`/`endsWith`/`replace` |
| `std-async` | `sleep`, `delayValue` |
| `std-path` | `basename`/`dirname`/`extname`/`join`/`isAbsolute` |
| `std-collections` | generic `List<T>` + `listOf` |
| `std-process` | `args`/`env`/`cwd`/`platform`/`exit` |
| `std-time` | `SECOND`…`DAY` + `nowMs`/`toISO`/`seconds`/`minutes` |
| `std-json` | Result-returning `parse` + `stringify`/`stringifyPretty` |
| `std-schema` | reified `Schema<T>` — `string`/`number`/`boolean`/`array`/`literal`/`optional`/`nullable`/`object` + `refine` |
| `std-fs` | Result-returning `readText`/`writeText` + `exists` |

## Why SJS source

The stdlib is the first real consumer of the compiler: it exercises generics,
generic classes, sum types + `match`, `try`/`catch`, and the JS globals
(`Math`, `process`, `Date`, `node:fs`). Keeping it in SJS keeps the language
honest — anything the stdlib needs, the language must support.
