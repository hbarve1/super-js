/**
 * Import extraction tests — T047
 *
 * extractImports() parses a .sjs source string and returns all static import paths.
 *
 * ECMA-262 §16.2.2 — Static Semantics: ImportedLocalNames
 * https://tc39.es/ecma262/#sec-imports
 */

import { extractImports } from '../../src/watch/import-extractor'

describe('extractImports()', () => {
  it('returns empty array for a file with no imports', () => {
    expect(extractImports('const x = 1')).toEqual([])
  })

  it('extracts named imports', () => {
    const src = `import { readFileSync } from 'fs'`
    expect(extractImports(src)).toContain('fs')
  })

  it('extracts default imports', () => {
    const src = `import path from 'path'`
    expect(extractImports(src)).toContain('path')
  })

  it('extracts namespace imports', () => {
    const src = `import * as t from '@babel/types'`
    expect(extractImports(src)).toContain('@babel/types')
  })

  it('extracts side-effect imports', () => {
    const src = `import './setup'`
    expect(extractImports(src)).toContain('./setup')
  })

  it('extracts multiple imports', () => {
    const src = [
      `import { a } from './a'`,
      `import { b } from './b'`,
      `import { c } from './c'`,
    ].join('\n')
    const paths = extractImports(src)
    expect(paths).toContain('./a')
    expect(paths).toContain('./b')
    expect(paths).toContain('./c')
  })

  it('extracts re-export paths', () => {
    const src = `export { foo } from './foo'`
    expect(extractImports(src)).toContain('./foo')
  })

  it('does not include dynamic imports (runtime, not static)', () => {
    // Dynamic import() is a runtime expression — not a static dependency
    const src = `const m = await import('./dynamic')`
    const paths = extractImports(src)
    // dynamic imports are NOT included in static import list
    expect(paths).not.toContain('./dynamic')
  })

  it('deduplicates repeated imports of the same specifier', () => {
    const src = [
      `import { a } from './shared'`,
      `import { b } from './shared'`,
    ].join('\n')
    const paths = extractImports(src)
    const count = paths.filter(p => p === './shared').length
    expect(count).toBe(1)
  })
})
