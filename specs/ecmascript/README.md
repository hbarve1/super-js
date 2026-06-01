# ECMAScript Specification Reference — Super.js

This directory is the authoritative cross-reference between Super.js (SJS) features and
the ECMA-262 specification. Every type-checker rule, compiler transform, and diagnostic
code in the prototype maps back to a section anchor here.

URL convention used throughout:
- **Living standard** (always current): `https://tc39.es/ecma262/#sec-<anchor>`
- **Versioned snapshot**: `https://262.ecma-international.org/<N>.0/#sec-<anchor>`

Both forms are listed in the tables below. The living standard URL is preferred for
in-code `specUrl` fields (as seen in `prototype/src/typeChecker/index.ts`).

---

## Version Index

| Edition | Common Name | Year | Versioned HTML Spec | Living Spec | Key Headline Features |
|---------|-------------|------|---------------------|-------------|----------------------|
| ES5     | ES5         | 2009 | https://262.ecma-international.org/5.1/ | n/a (predates living spec) | Strict mode, `Object.create`, `Array` extras, `JSON`, `get`/`set` |
| ES6     | ES2015      | 2015 | https://262.ecma-international.org/6.0/ | https://tc39.es/ecma262/ | `let`/`const`, arrow functions, classes, modules, `Symbol`, `Promise`, generators, destructuring, template literals, `Map`/`Set`/`WeakMap`/`WeakSet`, `Proxy`/`Reflect`, `for...of`, rest/spread, default params, `class` |
| ES7     | ES2016      | 2016 | https://262.ecma-international.org/7.0/ | https://tc39.es/ecma262/ | `Array.prototype.includes`, exponentiation operator `**` |
| ES8     | ES2017      | 2017 | https://262.ecma-international.org/8.0/ | https://tc39.es/ecma262/ | `async`/`await`, `Object.entries`/`Object.values`, shared memory (`SharedArrayBuffer`), `Atomics`, string padding |
| ES9     | ES2018      | 2018 | https://262.ecma-international.org/9.0/ | https://tc39.es/ecma262/ | Async iteration (`for await...of`), rest/spread in objects, `Promise.finally`, named capture groups in RegExp |
| ES10    | ES2019      | 2019 | https://262.ecma-international.org/10.0/ | https://tc39.es/ecma262/ | `Array.prototype.flat`/`flatMap`, `Object.fromEntries`, optional catch binding, `String.prototype.trimStart`/`trimEnd`, `Function.prototype.toString` revision |
| ES11    | ES2020      | 2020 | https://262.ecma-international.org/11.0/ | https://tc39.es/ecma262/ | `BigInt`, nullish coalescing `??`, optional chaining `?.`, `Promise.allSettled`, `globalThis`, dynamic `import()`, `String.prototype.matchAll`, `import.meta` |
| ES12    | ES2021      | 2021 | https://262.ecma-international.org/12.0/ | https://tc39.es/ecma262/ | `Promise.any`, `AggregateError`, logical assignment (`&&=`, `||=`, `??=`), `WeakRef`, `FinalizationRegistry`, numeric separators `1_000_000`, `String.prototype.replaceAll` |
| ES13    | ES2022      | 2022 | https://262.ecma-international.org/13.0/ | https://tc39.es/ecma262/ | Class static blocks, private class fields `#field`, private methods, `at()` method on Array/String/TypedArray, `Object.hasOwn`, `Error.cause`, top-level `await` in modules, RegExp match indices |
| ES14    | ES2023      | 2023 | https://262.ecma-international.org/14.0/ | https://tc39.es/ecma262/ | `Array.prototype.toSorted`/`toReversed`/`toSpliced`/`with`, `findLast`/`findLastIndex`, `Hashbang` grammar, `Symbol.iterator` on `WeakMap`/`WeakSet` |
| ES15    | ES2024      | 2024 | https://262.ecma-international.org/15.0/ | https://tc39.es/ecma262/ | `Promise.withResolvers`, `Object.groupBy`/`Map.groupBy`, `ArrayBuffer.prototype.transfer`, `RegExp` `/v` flag (Unicode sets), `Atomics.waitAsync` |
| ES16    | ES2025      | 2025 | https://262.ecma-international.org/16.0/ | https://tc39.es/ecma262/ | Iterator helpers (`Iterator.prototype.map/filter/take/drop/flatMap/reduce/toArray`), `Set` methods (`union`/`intersection`/`difference`/`symmetricDifference`/`isSubsetOf`/`isSupersetOf`/`isDisjointFrom`), `Promise.try`, `RegExp.escape`, `Float16Array`, duplicate named capture groups |

---

## SJS Compiler Target Matrix

Super.js supports `--target` flags that set the minimum ES version of emitted code.
The table below shows which runtime features require which target (or polyfill).

| `--target` | Emitted syntax floor | Requires transpilation of |
|------------|----------------------|---------------------------|
| `es5`      | ES5                  | Everything from ES2015+ (classes, arrow fns, modules, async/await, `??`, `?.`, `#fields`, BigInt, …) |
| `es2015`   | ES2015               | async/await, `??`, `?.`, `#fields`, BigInt, top-level await, iterator helpers, Set methods |
| `es2022`   | ES2022               | Iterator helpers, Set methods, `Promise.try`, `Float16Array` |
| `esnext`   | Living standard      | Nothing — pass-through |

---

## Full Compliance Matrix

Legend:
- ✅ Fully supported — SJS parses, type-checks, and emits correct output
- ⚠️  Partial — parsed/emitted but type checking is incomplete or untested
- 🔲 Planned — on the roadmap, not yet implemented
- ❌ Not supported — out of scope for v1

### ES5 — Foundational Features

| Feature | ECMA-262 Section | ES Version | SJS Status |
|---------|-----------------|------------|------------|
| Strict mode (`"use strict"`) | §10.2.1 ([living](https://tc39.es/ecma262/#sec-strict-mode-code)) | ES5 | ✅ |
| `var` declarations | §14.3.2 ([living](https://tc39.es/ecma262/#sec-variable-statement)) | ES5 | ✅ |
| Object literal `get`/`set` | §13.2.5 ([living](https://tc39.es/ecma262/#sec-object-initializer)) | ES5 | ✅ |
| `Array.prototype.forEach`/`map`/`filter`/`reduce` | §23.1.3 ([living](https://tc39.es/ecma262/#sec-properties-of-the-array-prototype-object)) | ES5 | ✅ |
| `Object.create` / `Object.defineProperty` | §20.1.2 ([living](https://tc39.es/ecma262/#sec-properties-of-the-object-constructor)) | ES5 | ✅ |
| `JSON.parse` / `JSON.stringify` | §25.5 ([living](https://tc39.es/ecma262/#sec-json-object)) | ES5 | ✅ |
| `Function.prototype.bind` | §20.2.3.2 ([living](https://tc39.es/ecma262/#sec-function.prototype.bind)) | ES5 | ✅ |
| `Date` object | §21.4 ([living](https://tc39.es/ecma262/#sec-date-objects)) | ES5 | ⚠️ |
| `try`/`catch`/`finally` | §14.15 ([living](https://tc39.es/ecma262/#sec-try-statement)) | ES5 | ✅ |
| `typeof` / `instanceof` operators | §13.5.2, §13.10 ([living](https://tc39.es/ecma262/#sec-typeof-operator)) | ES5 | ✅ |

### ES2015 (ES6) — Modern JavaScript Foundation

| Feature | ECMA-262 Section | ES Version | SJS Status |
|---------|-----------------|------------|------------|
| `let` declarations | §14.3.1 ([living](https://tc39.es/ecma262/#sec-let-and-const-declarations)) | ES2015 | ✅ |
| `const` declarations | §14.3.1 ([living](https://tc39.es/ecma262/#sec-let-and-const-declarations)) | ES2015 | ✅ |
| Arrow functions `=>` | §15.3 ([living](https://tc39.es/ecma262/#sec-arrow-function-definitions)) | ES2015 | ✅ |
| Class declarations | §15.7 ([living](https://tc39.es/ecma262/#sec-class-definitions)) | ES2015 | ⚠️ |
| Class expressions | §15.7 ([living](https://tc39.es/ecma262/#sec-class-definitions)) | ES2015 | ⚠️ |
| `extends` / inheritance | §15.7.1 ([living](https://tc39.es/ecma262/#sec-class-definitions)) | ES2015 | ⚠️ |
| `super` keyword | §13.4 ([living](https://tc39.es/ecma262/#sec-primary-expression)) | ES2015 | ⚠️ |
| Template literals | §13.2.8 ([living](https://tc39.es/ecma262/#sec-template-literals)) | ES2015 | ✅ |
| Tagged templates | §13.3.11 ([living](https://tc39.es/ecma262/#sec-tagged-templates)) | ES2015 | ⚠️ |
| Destructuring assignment (array) | §14.3.3 ([living](https://tc39.es/ecma262/#sec-destructuring-binding-patterns)) | ES2015 | ⚠️ |
| Destructuring assignment (object) | §14.3.3 ([living](https://tc39.es/ecma262/#sec-destructuring-binding-patterns)) | ES2015 | ⚠️ |
| Default parameter values | §15.1 ([living](https://tc39.es/ecma262/#sec-function-definitions)) | ES2015 | ✅ |
| Rest parameters `...args` | §15.1 ([living](https://tc39.es/ecma262/#sec-function-definitions)) | ES2015 | ✅ |
| Spread in calls `f(...arr)` | §13.3.8 ([living](https://tc39.es/ecma262/#sec-function-calls)) | ES2015 | ✅ |
| Spread in array literals `[...arr]` | §13.2.4 ([living](https://tc39.es/ecma262/#sec-array-initializer)) | ES2015 | ✅ |
| Computed property names | §13.2.5 ([living](https://tc39.es/ecma262/#sec-object-initializer)) | ES2015 | ✅ |
| Shorthand property names | §13.2.5 ([living](https://tc39.es/ecma262/#sec-object-initializer)) | ES2015 | ✅ |
| Shorthand method definitions | §13.2.5 ([living](https://tc39.es/ecma262/#sec-object-initializer)) | ES2015 | ✅ |
| `for...of` loop | §14.7.5 ([living](https://tc39.es/ecma262/#sec-for-in-and-for-of-statements)) | ES2015 | ✅ |
| Generators (`function*` / `yield`) | §15.5 ([living](https://tc39.es/ecma262/#sec-generator-function-definitions)) | ES2015 | ⚠️ |
| `Symbol` | §20.4 ([living](https://tc39.es/ecma262/#sec-symbol-objects)) | ES2015 | ⚠️ |
| `Symbol.iterator` / well-known symbols | §20.4.2 ([living](https://tc39.es/ecma262/#sec-well-known-symbols)) | ES2015 | ⚠️ |
| `Promise` | §27.2 ([living](https://tc39.es/ecma262/#sec-promise-objects)) | ES2015 | ⚠️ |
| `Map` | §24.1 ([living](https://tc39.es/ecma262/#sec-map-objects)) | ES2015 | ⚠️ |
| `Set` | §24.2 ([living](https://tc39.es/ecma262/#sec-set-objects)) | ES2015 | ⚠️ |
| `WeakMap` | §24.3 ([living](https://tc39.es/ecma262/#sec-weakmap-objects)) | ES2015 | ⚠️ |
| `WeakSet` | §24.4 ([living](https://tc39.es/ecma262/#sec-weakset-objects)) | ES2015 | ⚠️ |
| `Proxy` | §28.2 ([living](https://tc39.es/ecma262/#sec-proxy-objects)) | ES2015 | 🔲 |
| `Reflect` | §28.1 ([living](https://tc39.es/ecma262/#sec-reflect-object)) | ES2015 | 🔲 |
| ES modules `import` / `export` | §16.2 ([living](https://tc39.es/ecma262/#sec-modules)) | ES2015 | ✅ |
| `import` default / named / namespace | §16.2.2 ([living](https://tc39.es/ecma262/#sec-imports)) | ES2015 | ✅ |
| `export` named / default / re-export | §16.2.3 ([living](https://tc39.es/ecma262/#sec-exports)) | ES2015 | ✅ |
| `Iterable` protocol | §27.1 ([living](https://tc39.es/ecma262/#sec-iteration)) | ES2015 | ⚠️ |

### ES2016

| Feature | ECMA-262 Section | ES Version | SJS Status |
|---------|-----------------|------------|------------|
| `Array.prototype.includes` | §23.1.3.15 ([living](https://tc39.es/ecma262/#sec-array.prototype.includes)) | ES2016 | ✅ |
| Exponentiation operator `**` | §13.6 ([living](https://tc39.es/ecma262/#sec-exp-operator)) | ES2016 | ✅ |

### ES2017

| Feature | ECMA-262 Section | ES Version | SJS Status |
|---------|-----------------|------------|------------|
| `async` functions | §15.8 ([living](https://tc39.es/ecma262/#sec-async-function-definitions)) | ES2017 | ✅ |
| `await` expression | §15.8 ([living](https://tc39.es/ecma262/#sec-async-function-definitions)) | ES2017 | ✅ |
| `Object.entries` | §20.1.2.5 ([living](https://tc39.es/ecma262/#sec-object.entries)) | ES2017 | ✅ |
| `Object.values` | §20.1.2.22 ([living](https://tc39.es/ecma262/#sec-object.values)) | ES2017 | ✅ |
| `String.prototype.padStart` / `padEnd` | §22.1.3.16 ([living](https://tc39.es/ecma262/#sec-string.prototype.padstart)) | ES2017 | ✅ |
| `SharedArrayBuffer` | §25.1 ([living](https://tc39.es/ecma262/#sec-sharedarraybuffer-objects)) | ES2017 | 🔲 |
| `Atomics` | §25.4 ([living](https://tc39.es/ecma262/#sec-atomics-object)) | ES2017 | 🔲 |
| `Object.getOwnPropertyDescriptors` | §20.1.2.9 ([living](https://tc39.es/ecma262/#sec-object.getownpropertydescriptors)) | ES2017 | ✅ |

### ES2018

| Feature | ECMA-262 Section | ES Version | SJS Status |
|---------|-----------------|------------|------------|
| Async iteration (`for await...of`) | §14.7.5.4 ([living](https://tc39.es/ecma262/#sec-for-in-and-for-of-statements)) | ES2018 | ⚠️ |
| Async generators (`async function*`) | §15.6 ([living](https://tc39.es/ecma262/#sec-asyncgenerator-definitions)) | ES2018 | ⚠️ |
| Rest in object destructuring `{...rest}` | §14.3.3 ([living](https://tc39.es/ecma262/#sec-destructuring-binding-patterns)) | ES2018 | ⚠️ |
| Spread in object literals `{...obj}` | §13.2.5 ([living](https://tc39.es/ecma262/#sec-object-initializer)) | ES2018 | ✅ |
| `Promise.prototype.finally` | §27.2.5.3 ([living](https://tc39.es/ecma262/#sec-promise.prototype.finally)) | ES2018 | ✅ |
| RegExp named capture groups | §22.2 ([living](https://tc39.es/ecma262/#sec-regexp-regular-expression-objects)) | ES2018 | ⚠️ |
| RegExp lookbehind assertions | §22.2 ([living](https://tc39.es/ecma262/#sec-regexp-regular-expression-objects)) | ES2018 | ⚠️ |
| RegExp `s` (dotAll) flag | §22.2.1 ([living](https://tc39.es/ecma262/#sec-patterns)) | ES2018 | ⚠️ |
| RegExp Unicode property escapes | §22.2.1 ([living](https://tc39.es/ecma262/#sec-patterns)) | ES2018 | ⚠️ |

### ES2019

| Feature | ECMA-262 Section | ES Version | SJS Status |
|---------|-----------------|------------|------------|
| `Array.prototype.flat` | §23.1.3.11 ([living](https://tc39.es/ecma262/#sec-array.prototype.flat)) | ES2019 | ✅ |
| `Array.prototype.flatMap` | §23.1.3.12 ([living](https://tc39.es/ecma262/#sec-array.prototype.flatmap)) | ES2019 | ✅ |
| `Object.fromEntries` | §20.1.2.6 ([living](https://tc39.es/ecma262/#sec-object.fromentries)) | ES2019 | ✅ |
| Optional catch binding | §14.15 ([living](https://tc39.es/ecma262/#sec-try-statement)) | ES2019 | ✅ |
| `String.prototype.trimStart` / `trimEnd` | §22.1.3.31 ([living](https://tc39.es/ecma262/#sec-string.prototype.trimstart)) | ES2019 | ✅ |
| Well-formed `JSON.stringify` | §25.5.2 ([living](https://tc39.es/ecma262/#sec-json.stringify)) | ES2019 | ✅ |
| `Function.prototype.toString` revision | §20.2.3.5 ([living](https://tc39.es/ecma262/#sec-function.prototype.tostring)) | ES2019 | ✅ |
| `Symbol.prototype.description` | §20.4.3.2 ([living](https://tc39.es/ecma262/#sec-symbol.prototype.description)) | ES2019 | ⚠️ |
| `Array.prototype.sort` stability | §23.1.3.28 ([living](https://tc39.es/ecma262/#sec-array.prototype.sort)) | ES2019 | ✅ |

### ES2020

| Feature | ECMA-262 Section | ES Version | SJS Status |
|---------|-----------------|------------|------------|
| `BigInt` | §21.2 ([living](https://tc39.es/ecma262/#sec-bigint-objects)) | ES2020 | ⚠️ |
| BigInt literals `42n` | §12.9.3 ([living](https://tc39.es/ecma262/#sec-numericvalue)) | ES2020 | ⚠️ |
| Nullish coalescing `??` | §13.13 ([living](https://tc39.es/ecma262/#sec-binary-logical-operators)) | ES2020 | ✅ |
| Optional chaining `?.` | §13.5.7 ([living](https://tc39.es/ecma262/#sec-optional-chaining)) | ES2020 | ✅ |
| `Promise.allSettled` | §27.2.4.3 ([living](https://tc39.es/ecma262/#sec-promise.allsettled)) | ES2020 | ✅ |
| `globalThis` | §19.1 ([living](https://tc39.es/ecma262/#sec-globalthis)) | ES2020 | ✅ |
| Dynamic `import()` | §13.3.10 ([living](https://tc39.es/ecma262/#sec-import-calls)) | ES2020 | ⚠️ |
| `String.prototype.matchAll` | §22.1.3.13 ([living](https://tc39.es/ecma262/#sec-string.prototype.matchall)) | ES2020 | ✅ |
| `import.meta` | §13.3.12 ([living](https://tc39.es/ecma262/#sec-meta-properties)) | ES2020 | ⚠️ |
| `for...in` order guaranteed | §14.7.5 ([living](https://tc39.es/ecma262/#sec-for-in-and-for-of-statements)) | ES2020 | ✅ |
| `Promise.all` / `Promise.race` | §27.2.4.1 ([living](https://tc39.es/ecma262/#sec-promise.all)) | ES2020 | ✅ |
| Nullish coalescing assignment `??=` | §13.15 ([living](https://tc39.es/ecma262/#sec-assignment-operators)) | ES2021 | ✅ |

### ES2021

| Feature | ECMA-262 Section | ES Version | SJS Status |
|---------|-----------------|------------|------------|
| `Promise.any` | §27.2.4.2 ([living](https://tc39.es/ecma262/#sec-promise.any)) | ES2021 | ✅ |
| `AggregateError` | §20.5.7 ([living](https://tc39.es/ecma262/#sec-aggregate-error-objects)) | ES2021 | ⚠️ |
| Logical assignment `&&=` | §13.15 ([living](https://tc39.es/ecma262/#sec-assignment-operators)) | ES2021 | ✅ |
| Logical assignment `\|\|=` | §13.15 ([living](https://tc39.es/ecma262/#sec-assignment-operators)) | ES2021 | ✅ |
| Logical assignment `??=` | §13.15 ([living](https://tc39.es/ecma262/#sec-assignment-operators)) | ES2021 | ✅ |
| `WeakRef` | §26.1 ([living](https://tc39.es/ecma262/#sec-weak-ref-objects)) | ES2021 | 🔲 |
| `FinalizationRegistry` | §26.2 ([living](https://tc39.es/ecma262/#sec-finalization-registry-objects)) | ES2021 | 🔲 |
| Numeric separators `1_000_000` | §12.9.3 ([living](https://tc39.es/ecma262/#sec-literals-numeric-literals)) | ES2021 | ✅ |
| `String.prototype.replaceAll` | §22.1.3.19 ([living](https://tc39.es/ecma262/#sec-string.prototype.replaceall)) | ES2021 | ✅ |
| `Array.prototype.at` (proposed in ES2022) | §23.1.3.1 ([living](https://tc39.es/ecma262/#sec-array.prototype.at)) | ES2022 | ✅ |

### ES2022

| Feature | ECMA-262 Section | ES Version | SJS Status |
|---------|-----------------|------------|------------|
| Class static blocks | §15.7.1 ([living](https://tc39.es/ecma262/#sec-class-definitions)) | ES2022 | ⚠️ |
| Private class fields `#field` | §15.7.3 ([living](https://tc39.es/ecma262/#sec-ecmascript-language-functions-and-classes)) | ES2022 | ⚠️ |
| Private class methods `#method()` | §15.7.3 ([living](https://tc39.es/ecma262/#sec-ecmascript-language-functions-and-classes)) | ES2022 | ⚠️ |
| Private static fields/methods | §15.7.3 ([living](https://tc39.es/ecma262/#sec-ecmascript-language-functions-and-classes)) | ES2022 | ⚠️ |
| `in` operator for private fields `#f in obj` | §13.10 ([living](https://tc39.es/ecma262/#sec-relational-operators)) | ES2022 | 🔲 |
| `Array.prototype.at` | §23.1.3.1 ([living](https://tc39.es/ecma262/#sec-array.prototype.at)) | ES2022 | ✅ |
| `String.prototype.at` | §22.1.3.1 ([living](https://tc39.es/ecma262/#sec-string.prototype.at)) | ES2022 | ✅ |
| `TypedArray.prototype.at` | §23.2.3.1 ([living](https://tc39.es/ecma262/#sec-%typedarray%.prototype.at)) | ES2022 | ✅ |
| `Object.hasOwn` | §20.1.2.10 ([living](https://tc39.es/ecma262/#sec-object.hasown)) | ES2022 | ✅ |
| `Error.cause` | §20.5.5.1 ([living](https://tc39.es/ecma262/#sec-error-objects)) | ES2022 | ✅ |
| Top-level `await` in modules | §16.2.1.1 ([living](https://tc39.es/ecma262/#sec-modules)) | ES2022 | ⚠️ |
| RegExp match indices `/d` flag | §22.2.1 ([living](https://tc39.es/ecma262/#sec-patterns)) | ES2022 | 🔲 |
| `at()` on sliceable built-ins | §23.1.3.1 ([living](https://tc39.es/ecma262/#sec-array.prototype.at)) | ES2022 | ✅ |

### ES2023

| Feature | ECMA-262 Section | ES Version | SJS Status |
|---------|-----------------|------------|------------|
| `Array.prototype.toSorted` | §23.1.3.31 ([living](https://tc39.es/ecma262/#sec-array.prototype.tosorted)) | ES2023 | ✅ |
| `Array.prototype.toReversed` | §23.1.3.30 ([living](https://tc39.es/ecma262/#sec-array.prototype.toreversed)) | ES2023 | ✅ |
| `Array.prototype.toSpliced` | §23.1.3.32 ([living](https://tc39.es/ecma262/#sec-array.prototype.tospliced)) | ES2023 | ✅ |
| `Array.prototype.with` | §23.1.3.36 ([living](https://tc39.es/ecma262/#sec-array.prototype.with)) | ES2023 | ✅ |
| `Array.prototype.findLast` | §23.1.3.9 ([living](https://tc39.es/ecma262/#sec-array.prototype.findlast)) | ES2023 | ✅ |
| `Array.prototype.findLastIndex` | §23.1.3.10 ([living](https://tc39.es/ecma262/#sec-array.prototype.findlastindex)) | ES2023 | ✅ |
| Hashbang `#!` grammar | §12.5 ([living](https://tc39.es/ecma262/#sec-hashbang)) | ES2023 | 🔲 |
| `Symbol` as `WeakMap`/`WeakSet` keys | §24.3, §24.4 ([living](https://tc39.es/ecma262/#sec-weakmap-objects)) | ES2023 | 🔲 |

### ES2024

| Feature | ECMA-262 Section | ES Version | SJS Status |
|---------|-----------------|------------|------------|
| `Promise.withResolvers` | §27.2.4.6 ([living](https://tc39.es/ecma262/#sec-promise.withresolvers)) | ES2024 | 🔲 |
| `Object.groupBy` | §20.1.2.11 ([living](https://tc39.es/ecma262/#sec-object.groupby)) | ES2024 | 🔲 |
| `Map.groupBy` | §24.1.2.1 ([living](https://tc39.es/ecma262/#sec-map.groupby)) | ES2024 | 🔲 |
| `ArrayBuffer.prototype.transfer` | §25.1.5 ([living](https://tc39.es/ecma262/#sec-arraybuffer.prototype.transfer)) | ES2024 | 🔲 |
| RegExp `/v` flag (Unicode sets) | §22.2.1 ([living](https://tc39.es/ecma262/#sec-patterns)) | ES2024 | 🔲 |
| `Atomics.waitAsync` | §25.4.4 ([living](https://tc39.es/ecma262/#sec-atomics.waitasync)) | ES2024 | 🔲 |
| Well-formed Unicode strings | §22.1 ([living](https://tc39.es/ecma262/#sec-string-objects)) | ES2024 | 🔲 |

### ES2025

| Feature | ECMA-262 Section | ES Version | SJS Status |
|---------|-----------------|------------|------------|
| Iterator helpers (`Iterator.prototype.map/filter/take/drop/flatMap/reduce/toArray/forEach/some/every/find`) | §27.1.4 ([living](https://tc39.es/ecma262/#sec-iterator-prototype)) | ES2025 | 🔲 |
| `Iterator.from` | §27.1.2.1 ([living](https://tc39.es/ecma262/#sec-iterator.from)) | ES2025 | 🔲 |
| `Set.prototype.union` | §24.2.3 ([living](https://tc39.es/ecma262/#sec-set-objects)) | ES2025 | 🔲 |
| `Set.prototype.intersection` | §24.2.3 ([living](https://tc39.es/ecma262/#sec-set-objects)) | ES2025 | 🔲 |
| `Set.prototype.difference` | §24.2.3 ([living](https://tc39.es/ecma262/#sec-set-objects)) | ES2025 | 🔲 |
| `Set.prototype.symmetricDifference` | §24.2.3 ([living](https://tc39.es/ecma262/#sec-set-objects)) | ES2025 | 🔲 |
| `Set.prototype.isSubsetOf` | §24.2.3 ([living](https://tc39.es/ecma262/#sec-set-objects)) | ES2025 | 🔲 |
| `Set.prototype.isSupersetOf` | §24.2.3 ([living](https://tc39.es/ecma262/#sec-set-objects)) | ES2025 | 🔲 |
| `Set.prototype.isDisjointFrom` | §24.2.3 ([living](https://tc39.es/ecma262/#sec-set-objects)) | ES2025 | 🔲 |
| `Promise.try` | §27.2.4.7 ([living](https://tc39.es/ecma262/#sec-promise.try)) | ES2025 | 🔲 |
| `RegExp.escape` | §22.2.2 ([living](https://tc39.es/ecma262/#sec-regexp-constructor)) | ES2025 | 🔲 |
| `Float16Array` | §23.2 ([living](https://tc39.es/ecma262/#sec-typedarray-objects)) | ES2025 | 🔲 |
| Duplicate named capture groups | §22.2.1 ([living](https://tc39.es/ecma262/#sec-patterns)) | ES2025 | 🔲 |
| `import` attributes (`with { type: "json" }`) | §16.2.2 ([living](https://tc39.es/ecma262/#sec-imports)) | ES2025 | 🔲 |

### Super.js — Type System Extensions (beyond ECMA-262)

These features are SJS-specific additions on top of ECMAScript.

| Feature | Basis | SJS Status | Notes |
|---------|-------|------------|-------|
| Type annotations on variables | TypeScript / SJS spec | ✅ | `let x: number = 5` |
| Type annotations on parameters | TypeScript / SJS spec | ✅ | `function f(x: number)` |
| Return type annotations | TypeScript / SJS spec | ✅ | `function f(): string` |
| Union types `A \| B` | TypeScript / SJS spec | ✅ | `string \| null` |
| Array types `T[]` | TypeScript / SJS spec | ✅ | `number[]` |
| Function types `(x: T) => R` | TypeScript / SJS spec | ✅ | |
| `any` type (gradual escape) | Gradual typing theory | ✅ | consistent with all types |
| `never` type | TypeScript / SJS spec | ⚠️ | parsed, not fully checked |
| `void` return type | TypeScript / SJS spec | ✅ | |
| Optional parameters `param?` | TypeScript / SJS spec | ✅ | |
| Strict mode `--strict` / `noImplicitAny` | TypeScript / SJS spec | ✅ | emits SJS-W001 |
| Interface declarations | TypeScript / SJS spec | 🔲 | planned |
| Generic type parameters `<T>` | TypeScript / SJS spec | 🔲 | planned |
| Intersection types `A & B` | TypeScript / SJS spec | 🔲 | planned |
| Type aliases `type X = ...` | TypeScript / SJS spec | 🔲 | planned |
| Enum declarations | TypeScript / SJS spec | 🔲 | planned |
| Tuple types `[A, B]` | TypeScript / SJS spec | 🔲 | planned |
| JSX element types | JSX spec / React types | ⚠️ | transform works, types partial |

---

## Diagnostic Code → Spec URL Map

| Code | Severity | Rule | Spec URL |
|------|----------|------|----------|
| SJS-E001 | error | Type mismatch on variable declaration or assignment | https://tc39.es/ecma262/#sec-let-and-const-declarations |
| SJS-E002 | error | Return type mismatch or illegal return in void function | https://tc39.es/ecma262/#sec-function-definitions |
| SJS-E003 | error | Call argument count or type mismatch | https://tc39.es/ecma262/#sec-evaluatecall |
| SJS-W001 | warning | Implicit `any` (strict mode) | https://www.typescriptlang.org/tsconfig/#noImplicitAny |

---

## File Map

```
specs/ecmascript/
├── README.md              ← this file (version index + compliance matrix)
├── section-map.md         ← SJS feature → ECMA-262 §section + URL
├── es5/highlights.md
├── es2015/highlights.md
├── es2016/highlights.md
├── es2017/highlights.md
├── es2018/highlights.md
├── es2019/highlights.md
├── es2020/highlights.md
├── es2021/highlights.md
├── es2022/highlights.md
├── es2023/highlights.md
├── es2024/highlights.md
└── es2025/highlights.md
```
