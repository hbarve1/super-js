"use strict";
/**
 * SuperJS type system — discriminated union of all SJS types.
 *
 * Primitive kinds map directly to ECMAScript Language Types (ECMA-262 §6.1):
 *   https://tc39.es/ecma262/#sec-ecmascript-language-types
 *
 * NOTE: `AnyType` from the prototype is intentionally absent — SJS uses
 * `DynamicType` as its runtime-checked escape hatch instead.
 * `IntersectionType` is also absent — SJS bans `A & B`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=types.js.map