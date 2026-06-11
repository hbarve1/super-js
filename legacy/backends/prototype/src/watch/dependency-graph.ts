/**
 * Dependency graph — T048
 *
 * Maintains two maps:
 *   forward:  file → Set<importedFile>   (what does this file import?)
 *   reverse:  file → Set<importerFile>   (who imports this file?)
 *
 * markDirty(file) performs a BFS on the reverse map to return the full
 * transitive dirty set: the changed file plus every file that (directly or
 * indirectly) depends on it.
 *
 * This is the "reverse import walk" described in:
 *   specs/001-superjs-core-language/research.md §1 — Cascading Recompilation
 */

export class DependencyGraph {
  /** forward[A] = files that A imports */
  private forward = new Map<string, Set<string>>()
  /** reverse[B] = files that import B */
  private reverse = new Map<string, Set<string>>()

  /** Register the complete import list for `file`. */
  setImports(file: string, imports: string[]): void {
    // Remove stale reverse edges for the previous import set
    const prev = this.forward.get(file) ?? new Set()
    for (const dep of prev) {
      this.reverse.get(dep)?.delete(file)
    }

    // Record forward edges
    this.forward.set(file, new Set(imports))

    // Record reverse edges
    for (const dep of imports) {
      if (!this.reverse.has(dep)) this.reverse.set(dep, new Set())
      this.reverse.get(dep)!.add(file)
    }
  }

  /** Returns the files that `file` imports (forward edges). */
  getImports(file: string): string[] {
    return Array.from(this.forward.get(file) ?? [])
  }

  /** Returns the files that import `file` (reverse edges). */
  getImporters(file: string): string[] {
    return Array.from(this.reverse.get(file) ?? [])
  }

  /**
   * Returns the transitive dirty set for a changed `file`.
   *
   * Uses BFS on the reverse map so that every file that directly or
   * indirectly depends on `file` is included exactly once.
   *
   * Algorithm:
   *   1. Start with worklist = {file}
   *   2. For each node, enqueue all reverse-edge neighbors not yet visited
   *   3. Return visited set as array
   */
  markDirty(file: string): string[] {
    const visited = new Set<string>()
    const queue: string[] = [file]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)

      for (const importer of this.getImporters(current)) {
        if (!visited.has(importer)) queue.push(importer)
      }
    }

    return Array.from(visited)
  }
}
