/**
 * Transforms SJS nullable type syntax `T?` into `T | null | undefined`.
 *
 * Only applies in type annotation positions (after `:`).
 * Does NOT affect:
 *   - Optional chaining: `obj?.prop` (pattern is `?.` not just `?`)
 *   - Optional parameters: `(x?: string)` (pattern is `?:` not `?`)
 *   - Ternary expressions: `a ? b : c`
 *
 * SJS-specific feature — TypeScript does not have this syntax.
 */
export function transformNullSafety(source: string): string {
  // Handle inline object type nullable: `{ ... }?` → `{ ... } | null | undefined`
  // The `?` must immediately follow `}` (no space) and not be optional chaining `?.` or `?:`
  const step1 = source.replace(
    /\}\?(?![?:.([\w])/g,
    '} | null | undefined',
  )

  // Replace `: Type?` → `: Type | null | undefined`
  // The type name must:
  //   - Start with a letter/underscore (prevents matching expression identifiers via ternary `:`)
  //   - Be a simple identifier, optionally with one level of generic params and/or array brackets
  // The negative lookahead (?![?:.\w]) prevents matching `?.` (optional chaining) and `?:` (optional params).
  // When `[]` follows `?` (e.g. `string?[]`), they are captured and the union is wrapped in parens.
  return step1.replace(
    /:\s*([A-Za-z_]\w*(?:<[^>]*>)?(?:\[\])*)\?((?:\[\])*)(?![?:.\w])/g,
    (_match, typePart, arraySuffix) => {
      const base = typePart.trim()
      const expanded = `${base} | null | undefined`
      if (arraySuffix) {
        return `: (${expanded})${arraySuffix}`
      }
      return `: ${expanded}`
    },
  )
}
