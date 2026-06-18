/**
 * `@superjs/stdlib` — the SuperJS standard library, written in SJS and compiled
 * by the SuperJS compiler. Modules live in `src/modules/*.sjs`; they map to the
 * published `@superjs/std-*` packages (Layer-1/2 of the roadmap).
 *
 * This package's TypeScript surface only enumerates the modules; the actual
 * library is the `.sjs` source, validated by the spec to type-check and emit.
 */

export const STDLIB_MODULES = ['std-core', 'std-math', 'std-string', 'std-async'] as const;
export type StdlibModule = (typeof STDLIB_MODULES)[number];
