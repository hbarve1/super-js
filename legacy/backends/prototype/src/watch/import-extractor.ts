/**
 * Static import extraction — T047
 *
 * Parses a .sjs source string with Babel and returns the set of static import
 * specifiers (module paths). Dynamic `import()` expressions are excluded because
 * they are runtime constructs, not static graph edges.
 *
 * ECMA-262 §16.2.2 — Static Semantics: ImportedLocalNames
 * https://tc39.es/ecma262/#sec-imports
 *
 * ECMA-262 §16.2.3 — Static Semantics: ExportedNames (for re-exports)
 * https://tc39.es/ecma262/#sec-exports
 */

import { parse } from '@babel/parser'
import traverse from '@babel/traverse'

/**
 * Returns deduplicated static import/re-export specifiers from `source`.
 * Paths are exactly as written in the source (relative or bare specifiers).
 */
export function extractImports(source: string): string[] {
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
    errorRecovery: true,
  })

  const seen = new Set<string>()

  traverse(ast, {
    // import … from 'specifier'  — ECMA-262 §16.2.2
    ImportDeclaration(path) {
      seen.add(path.node.source.value)
    },
    // export { … } from 'specifier'  — ECMA-262 §16.2.3
    ExportNamedDeclaration(path) {
      if (path.node.source) {
        seen.add(path.node.source.value)
      }
    },
    // export * from 'specifier'  — ECMA-262 §16.2.3
    ExportAllDeclaration(path) {
      seen.add(path.node.source.value)
    },
    // Dynamic import() — deliberately NOT collected (runtime, not static)
  })

  return Array.from(seen)
}
