/**
 * Watcher — T050
 *
 * Orchestrates incremental recompilation when source files change.
 *
 * Responsibilities:
 *   1. Content hashing — skip rebuilds when file content is unchanged
 *   2. BuildInfo tracking — per-file { hash, mtime, status }
 *   3. Dependency graph integration — DependencyGraph for transitive dirty set
 *   4. Topological ordering — topoSort determines safe recompile order
 *   5. Cycle detection — cycle nodes are marked 'blocked' with SJS-E004
 *   6. chokidar file watching with 100 ms debounce (start/stop lifecycle)
 *
 * ECMA-262 §16.2 — Module execution order (topological):
 * https://tc39.es/ecma262/#sec-modules
 */

import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { DependencyGraph } from './dependency-graph'
import { topoSort, TopoSortResult } from './topo-sort'
import { extractImports } from './import-extractor'
import { compile } from '../compiler'

// ── Types ─────────────────────────────────────────────────────────────────────

export type FileStatus = 'ok' | 'error' | 'blocked'

export interface BuildInfo {
  hash: string
  mtime: number
  status: FileStatus
}

// ── Watcher ───────────────────────────────────────────────────────────────────

export class Watcher {
  private readonly sourceRoot: string
  private readonly outDir: string

  private readonly graph = new DependencyGraph()
  private readonly buildInfos = new Map<string, BuildInfo>()

  // chokidar FSWatcher — loaded lazily to avoid the require cost when not watching
  private fsWatcher: { close(): Promise<void> } | null = null
  // Pending debounce timeout
  private debounceHandle: ReturnType<typeof setTimeout> | null = null
  // Files changed since the last debounce flush
  private pendingChanges = new Set<string>()

  constructor(sourceRoot: string, outDir: string) {
    this.sourceRoot = resolve(sourceRoot)
    this.outDir = resolve(outDir)
  }

  // ── Hashing ─────────────────────────────────────────────────────────────────

  /** Returns the SHA-256 hex digest of `content`. */
  hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex')
  }

  /** Returns true if `file`'s content hash differs from the stored BuildInfo. */
  hasChanged(file: string, content: string): boolean {
    const info = this.buildInfos.get(file)
    if (!info) return true
    return info.hash !== this.hashContent(content)
  }

  // ── BuildInfo ────────────────────────────────────────────────────────────────

  /** Stores a BuildInfo entry for `file`. */
  recordBuild(file: string, content: string, status: FileStatus): void {
    this.buildInfos.set(file, {
      hash: this.hashContent(content),
      mtime: Date.now(),
      status,
    })
  }

  /** Returns the stored BuildInfo for `file`, or null if not recorded. */
  getBuildInfo(file: string): BuildInfo | null {
    return this.buildInfos.get(file) ?? null
  }

  // ── Dependency graph ─────────────────────────────────────────────────────────

  /**
   * Updates the dependency graph for `file` with the provided `imports`.
   * Stale reverse edges are automatically removed by DependencyGraph.setImports().
   */
  updateImports(file: string, imports: string[]): void {
    this.graph.setImports(file, imports)
  }

  /**
   * Computes the transitive dirty set for a changed `file`.
   * Returns the file itself plus all files that (directly or indirectly) depend on it.
   *
   * Uses BFS on the reverse import map — see DependencyGraph.markDirty().
   */
  computeDirtySet(file: string): string[] {
    return this.graph.markDirty(file)
  }

  // ── Topological sort + cycle handling ────────────────────────────────────────

  /**
   * Sorts `dirty` into dependency-first compilation order using Kahn's algorithm.
   *
   * Side-effect: any file that is part of a cycle has its BuildInfo status
   * set to 'blocked' so callers know not to emit output for those files.
   *
   * Cycle members are reported as SJS-E004 diagnostics:
   * https://tc39.es/ecma262/#sec-moduleevaluation
   */
  sortDirty(dirty: string[]): TopoSortResult {
    const allImports = new Map<string, string[]>()
    for (const file of dirty) {
      allImports.set(file, this.graph.getImports(file))
    }

    const result = topoSort(dirty, allImports)

    for (const cycle of result.cycles) {
      for (const file of cycle.files) {
        const prev = this.buildInfos.get(file)
        this.buildInfos.set(file, {
          hash: prev?.hash ?? '',
          mtime: prev?.mtime ?? Date.now(),
          status: 'blocked',
        })
      }
    }

    return result
  }

  // ── File watching (chokidar) ──────────────────────────────────────────────────

  /**
   * Starts watching `pattern` (glob or file path) with chokidar.
   * Changes are debounced for 100 ms then processed in topological order.
   *
   * @param pattern - glob or path to watch (e.g. `src/**‌/*.sjs`)
   * @param onBuildComplete - optional callback invoked after each recompile batch
   */
  async start(
    pattern: string,
    onBuildComplete?: (results: Map<string, FileStatus>) => void,
  ): Promise<void> {
    const chokidar = await import('chokidar')
    this.fsWatcher = chokidar.watch(pattern, {
      ignoreInitial: false,
      persistent: true,
    })

    const flush = async () => {
      const batch = new Set(this.pendingChanges)
      this.pendingChanges.clear()

      const results = new Map<string, FileStatus>()

      for (const file of batch) {
        let content: string
        try {
          content = readFileSync(file, 'utf-8')
        } catch {
          continue
        }

        if (!this.hasChanged(file, content)) continue

        // Re-register imports after a content change
        const imports = extractImports(content)
        this.updateImports(file, imports)
      }

      // Compute union dirty set across all changed files
      const dirtyUnion = new Set<string>()
      for (const file of batch) {
        for (const dep of this.computeDirtySet(file)) {
          dirtyUnion.add(dep)
        }
      }

      const { order, cycles } = this.sortDirty(Array.from(dirtyUnion))

      // Report cycle-blocked files immediately
      for (const cycle of cycles) {
        for (const file of cycle.files) {
          results.set(file, 'blocked')
          process.stderr.write(`[SJS-E004] Circular import involving ${file}\n`)
        }
      }

      // Compile in topological order
      for (const file of order) {
        let content: string
        try {
          content = readFileSync(file, 'utf-8')
        } catch {
          this.recordBuild(file, '', 'error')
          results.set(file, 'error')
          continue
        }

        try {
          await compile({
            sourceFile: file,
            outDir: this.outDir,
            sourceRoot: this.sourceRoot,
            silent: true,
          })
          this.recordBuild(file, content, 'ok')
          results.set(file, 'ok')
        } catch {
          this.recordBuild(file, content, 'error')
          results.set(file, 'error')
        }
      }

      onBuildComplete?.(results)
    }

    const schedule = (file: string) => {
      this.pendingChanges.add(file)
      if (this.debounceHandle !== null) clearTimeout(this.debounceHandle)
      this.debounceHandle = setTimeout(flush, 100)
    }

    // chokidar emits 'add' for initial scan and 'change' for subsequent changes
    ;(this.fsWatcher as ReturnType<typeof chokidar.watch>)
      .on('add', schedule)
      .on('change', schedule)
  }

  /** Stops the chokidar watcher and clears any pending debounce. */
  async stop(): Promise<void> {
    if (this.debounceHandle !== null) {
      clearTimeout(this.debounceHandle)
      this.debounceHandle = null
    }
    if (this.fsWatcher) {
      await this.fsWatcher.close()
      this.fsWatcher = null
    }
  }
}
