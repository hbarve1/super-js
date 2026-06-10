/**
 * Transforms SJS nullable type syntax `T?` into `T | null | undefined`.
 *
 * Only applies in type annotation positions (after `:`).
 * Does NOT affect:
 *   - Optional chaining: `obj?.prop` (pattern is `?.` not just `?`)
 *   - Optional parameters: `(x?: string)` — no `:` directly before the identifier
 *   - Ternary expressions: `a ? b : c` — ternary colons are preceded by expressions,
 *     not a single type identifier
 *
 * Handles:
 *   - Simple types: `string?` → `string | null | undefined`
 *   - Array suffix: `string?[]` → `(string | null | undefined)[]`
 *   - Generic types: `Array<T>?` → `Array<T> | null | undefined`
 *   - Object types: `{ city: string }?` → `{ city: string } | null | undefined`
 *
 * SJS-specific feature — TypeScript does not have this syntax.
 */
export function transformNullSafety(source: string): string {
  // A single type term: an identifier with optional generics and/or [] suffix,
  // OR a shallow inline object type `{...}`.
  // Intentionally excludes commas at the top level to avoid matching across parameter lists.
  const term = '(?:[A-Za-z_][\\w.]*(?:<(?:[^<>]|<[^<>]*>)*>)?|\\{[^{}]+\\})(?:\\[\\])*'
  // A type expression: one or more terms joined by |
  const typeExpr = `${term}(?:\\s*\\|\\s*${term})*`

  return source.replace(
    new RegExp(`: *(${typeExpr})\\?((?:\\[\\])*)(?![\\w?.])`, 'g'),
    (_match, typePart, arraySuffix) => {
      if (arraySuffix) {
        return `: (${typePart.trim()} | null | undefined)${arraySuffix}`
      }
      return `: ${typePart.trim()} | null | undefined`
    },
  )
}
