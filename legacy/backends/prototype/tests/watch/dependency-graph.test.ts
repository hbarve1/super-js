/**
 * DependencyGraph tests — T048
 *
 * Tracks forward edges (file → its imports) and reverse edges (file → files
 * that import it). markDirty() returns the transitive dirty set via reverse-map walk.
 *
 * Research basis: specs/001-superjs-core-language/research.md §1
 */

import { DependencyGraph } from '../../src/watch/dependency-graph'

const A = '/project/a.sjs'
const B = '/project/b.sjs'
const C = '/project/c.sjs'
const D = '/project/d.sjs'

describe('DependencyGraph — forward map', () => {
  it('records imports for a file', () => {
    const g = new DependencyGraph()
    g.setImports(A, [B, C])
    expect(g.getImports(A)).toEqual(expect.arrayContaining([B, C]))
  })

  it('returns empty array for unknown file', () => {
    const g = new DependencyGraph()
    expect(g.getImports(A)).toEqual([])
  })

  it('replaces imports on second setImports call', () => {
    const g = new DependencyGraph()
    g.setImports(A, [B])
    g.setImports(A, [C])
    expect(g.getImports(A)).toEqual([C])
    expect(g.getImports(A)).not.toContain(B)
  })
})

describe('DependencyGraph — reverse map', () => {
  it('records reverse edge: B is imported by A', () => {
    const g = new DependencyGraph()
    g.setImports(A, [B])
    expect(g.getImporters(B)).toContain(A)
  })

  it('clears old reverse edges when imports are updated', () => {
    const g = new DependencyGraph()
    g.setImports(A, [B])
    g.setImports(A, [C])  // A no longer imports B
    expect(g.getImporters(B)).not.toContain(A)
    expect(g.getImporters(C)).toContain(A)
  })
})

describe('DependencyGraph — markDirty()', () => {
  it('returns the changed file itself', () => {
    const g = new DependencyGraph()
    g.setImports(A, [])
    expect(g.markDirty(A)).toContain(A)
  })

  it('includes direct importers', () => {
    const g = new DependencyGraph()
    // B imports A → changing A should dirty B
    g.setImports(B, [A])
    const dirty = g.markDirty(A)
    expect(dirty).toContain(A)
    expect(dirty).toContain(B)
  })

  it('walks the reverse map transitively: A←B←C', () => {
    const g = new DependencyGraph()
    g.setImports(B, [A])
    g.setImports(C, [B])
    const dirty = g.markDirty(A)
    expect(dirty).toContain(A)
    expect(dirty).toContain(B)
    expect(dirty).toContain(C)
  })

  it('handles diamond dependency without duplicates: A←B, A←C, B←D, C←D', () => {
    const g = new DependencyGraph()
    g.setImports(B, [A])
    g.setImports(C, [A])
    g.setImports(D, [B, C])
    const dirty = g.markDirty(A)
    const unique = new Set(dirty)
    expect(unique.size).toBe(dirty.length)   // no duplicates
    expect(dirty).toContain(D)
  })

  it('returns only the changed file when nothing imports it', () => {
    const g = new DependencyGraph()
    g.setImports(A, [B])
    const dirty = g.markDirty(A)
    expect(dirty).toEqual([A])
  })
})
