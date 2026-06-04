/**
 * Transforms SJS nullable type syntax `T?` into `T | null | undefined`.
 *
 * Only applies in type annotation positions (after `:` or `)`).
 * Does NOT affect:
 *   - Optional chaining: `obj?.prop` (pattern is `?.` not just `?`)
 *   - Optional parameters: `(x?: string)` (pattern is `?:` not `?`)
 *   - Ternary expressions: `a ? b : c`
 *
 * SJS-specific feature — TypeScript does not have this syntax.
 */
export function transformNullSafety(source: string): string {
  // Replace `: Type?` → `: Type | null | undefined`
  // Handles simple names, generic types like Array<T>, and union/intersection.
  // Uses a regex that matches type annotations followed by `?` (without another `?` next char).
  // The negative lookahead (?![\w?.]) prevents matching `?.` (optional chaining).
  return source.replace(
    /:\s*([\w<>\[\], ]+)\?(?![\w?.])/g,
    (_match, typePart) => `: ${typePart.trim()} | null | undefined`,
  )
}
