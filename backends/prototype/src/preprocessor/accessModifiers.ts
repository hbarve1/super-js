/**
 * Transforms SJS access modifier keywords to TypeScript equivalents:
 *   pub  → public
 *   priv → private
 *   prot → protected
 *
 * Applied before Babel parsing so TypeScript's access modifier semantics are used.
 * Word-boundary matching prevents replacing substrings of longer identifiers.
 */
export function transformAccessModifiers(source: string): string {
  return source
    .replace(/\bpub\b(?=\s)/g, 'public')
    .replace(/\bpriv\b(?=\s)/g, 'private')
    .replace(/\bprot\b(?=\s)/g, 'protected')
}
