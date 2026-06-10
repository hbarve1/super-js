/**
 * Topological sort tests — T049
 *
 * Kahn's algorithm on a dirty set.
 * Cycle detection produces SJS-E004 diagnostics for all cycle members.
 *
 * ECMA-262 §16.2 — Modules: import/export semantics that make topo-sort necessary.
 * https://tc39.es/ecma262/#sec-modules
 */

import { topoSort, TopoSortResult } from '../../src/watch/topo-sort'

const A = '/p/a.sjs'
const B = '/p/b.sjs'
const C = '/p/c.sjs'
const D = '/p/d.sjs'

describe('topoSort() — valid DAGs', () => {
  it('sorts a linear chain: A→B→C into [A, B, C]', () => {
    // A imports nothing; B imports A; C imports B
    const imports = new Map([[A, []], [B, [A]], [C, [B]]])
    const r = topoSort([A, B, C], imports)
    expect(r.cycles).toHaveLength(0)
    const order = r.order
    expect(order.indexOf(A)).toBeLessThan(order.indexOf(B))
    expect(order.indexOf(B)).toBeLessThan(order.indexOf(C))
  })

  it('sorts a diamond: A→B, A→C, B→D, C→D', () => {
    const imports = new Map([[A, []], [B, [A]], [C, [A]], [D, [B, C]]])
    const r = topoSort([A, B, C, D], imports)
    expect(r.cycles).toHaveLength(0)
    expect(r.order.indexOf(A)).toBeLessThan(r.order.indexOf(D))
  })

  it('handles single node', () => {
    const r = topoSort([A], new Map([[A, []]]))
    expect(r.order).toEqual([A])
    expect(r.cycles).toHaveLength(0)
  })

  it('handles empty dirty set', () => {
    const r = topoSort([], new Map())
    expect(r.order).toEqual([])
    expect(r.cycles).toHaveLength(0)
  })

  it('nodes not in the dirty set are ignored even if they appear in imports', () => {
    // Dirty set is only [B, C]; A exists but is not dirty
    const imports = new Map([[B, [A]], [C, [B]]])
    const r = topoSort([B, C], imports)
    expect(r.order).not.toContain(A)
    expect(r.order).toContain(B)
    expect(r.order).toContain(C)
  })
})

describe('topoSort() — cycle detection (SJS-E004)', () => {
  it('detects a direct 2-node cycle: A↔B', () => {
    const imports = new Map([[A, [B]], [B, [A]]])
    const r = topoSort([A, B], imports)
    expect(r.cycles.length).toBeGreaterThan(0)
    const cycleFiles = r.cycles.flatMap(c => c.files)
    expect(cycleFiles).toContain(A)
    expect(cycleFiles).toContain(B)
  })

  it('produces SJS-E004 diagnostic for each cycle', () => {
    const imports = new Map([[A, [B]], [B, [A]]])
    const r = topoSort([A, B], imports)
    expect(r.cycles[0].diagnostic.code).toBe('SJS-E004')
  })

  it('diagnostic message names the cycle members', () => {
    const imports = new Map([[A, [B]], [B, [A]]])
    const r = topoSort([A, B], imports)
    const msg = r.cycles[0].diagnostic.message
    expect(msg).toContain('a.sjs')
    expect(msg).toContain('b.sjs')
  })

  it('detects a 3-node cycle: A→B→C→A', () => {
    const imports = new Map([[A, [C]], [B, [A]], [C, [B]]])
    const r = topoSort([A, B, C], imports)
    expect(r.cycles.length).toBeGreaterThan(0)
    const files = r.cycles.flatMap(c => c.files)
    expect(files).toContain(A)
    expect(files).toContain(B)
    expect(files).toContain(C)
  })

  it('cycle nodes are not included in the valid order', () => {
    const imports = new Map([[A, [B]], [B, [A]], [C, []]])
    const r = topoSort([A, B, C], imports)
    expect(r.order).toContain(C)
    expect(r.order).not.toContain(A)
    expect(r.order).not.toContain(B)
  })
})

describe('topoSort() — TopoSortResult shape', () => {
  it('has order and cycles arrays', () => {
    const r: TopoSortResult = topoSort([A], new Map([[A, []]]))
    expect(Array.isArray(r.order)).toBe(true)
    expect(Array.isArray(r.cycles)).toBe(true)
  })
})
