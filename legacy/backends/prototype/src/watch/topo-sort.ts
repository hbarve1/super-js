/**
 * Topological sort — T049
 *
 * Kahn's algorithm on a dirty file set.
 * Files with no dirty dependencies are emitted first (safe compilation order).
 * Any nodes remaining after Kahn's completes are part of a cycle → SJS-E004.
 *
 * ECMA-262 §16.2 — Modules (the module evaluation order is topological):
 * https://tc39.es/ecma262/#sec-modules
 *
 * Algorithm reference: Kahn (1962) "Topological sorting of large networks"
 */

import { basename } from 'path'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CycleInfo {
  files: string[]
  diagnostic: {
    code: 'SJS-E004'
    severity: 'error'
    message: string
    specUrl: string
  }
}

export interface TopoSortResult {
  /** Files in safe compilation order (dependencies before dependents). */
  order: string[]
  /** One CycleInfo per detected cycle. Members are excluded from `order`. */
  cycles: CycleInfo[]
}

// ── topoSort ──────────────────────────────────────────────────────────────────

/**
 * Topologically sorts `dirty` (a subset of all files) using Kahn's BFS.
 *
 * `allImports` is the full forward-edge map for the project.
 * Only edges between nodes in the `dirty` set are considered —
 * edges to files outside the dirty set are ignored.
 *
 * ECMA-262 §16.2 — Module Execution Order:
 * https://tc39.es/ecma262/#sec-moduleevaluation
 */
export function topoSort(
  dirty: string[],
  allImports: Map<string, string[]>,
): TopoSortResult {
  const dirtySet = new Set(dirty)

  // Build in-degree map and adjacency list restricted to dirty nodes
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()  // dep → [files that depend on dep]

  for (const file of dirtySet) {
    if (!inDegree.has(file)) inDegree.set(file, 0)
    if (!dependents.has(file)) dependents.set(file, [])

    const imports = (allImports.get(file) ?? []).filter(imp => dirtySet.has(imp))
    for (const dep of imports) {
      if (!inDegree.has(dep)) inDegree.set(dep, 0)
      if (!dependents.has(dep)) dependents.set(dep, [])
      // `file` depends on `dep` — `dep` must come before `file`
      dependents.get(dep)!.push(file)
      inDegree.set(file, (inDegree.get(file) ?? 0) + 1)
    }
  }

  // Kahn's BFS: start with nodes that have no dirty dependencies
  const queue: string[] = []
  for (const [file, deg] of inDegree) {
    if (deg === 0) queue.push(file)
  }

  const order: string[] = []

  while (queue.length > 0) {
    const node = queue.shift()!
    order.push(node)
    for (const dependent of dependents.get(node) ?? []) {
      const newDeg = (inDegree.get(dependent) ?? 0) - 1
      inDegree.set(dependent, newDeg)
      if (newDeg === 0) queue.push(dependent)
    }
  }

  // Any node with in-degree > 0 after Kahn's is part of a cycle
  const cycleNodes = Array.from(inDegree.entries())
    .filter(([, deg]) => deg > 0)
    .map(([file]) => file)

  const cycles: CycleInfo[] = []
  if (cycleNodes.length > 0) {
    // Group all cycle nodes into one diagnostic for now
    // (detecting individual cycles within the SCC would require Tarjan's)
    const names = cycleNodes.map(f => basename(f)).join(' → ')
    cycles.push({
      files: cycleNodes,
      diagnostic: {
        code: 'SJS-E004',
        severity: 'error',
        message: `Circular import detected: ${names}. Circular imports are not allowed.`,
        specUrl: 'https://tc39.es/ecma262/#sec-moduleevaluation',
      },
    })
  }

  return { order, cycles }
}
