/**
 * Watcher tests — T050
 *
 * The Watcher orchestrates incremental recompilation on file changes.
 * It owns:
 *   - BuildInfo map: file → { hash, mtime, status }
 *   - DependencyGraph: tracks static import edges
 *   - topoSort: determines safe recompile order
 *   - 100 ms debounce: coalesces bursts of FS events
 *
 * These tests exercise the pure-logic methods (hash, dirty-set,
 * ordering) without requiring a live chokidar watcher or disk I/O.
 */

import { createHash } from 'crypto'
import { Watcher, BuildInfo, FileStatus } from '../../src/watch/watcher'

// ── helpers ───────────────────────────────────────────────────────────────────

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

// ── BuildInfo shape ────────────────────────────────────────────────────────────

describe('BuildInfo', () => {
  it('has hash, mtime, and status fields', () => {
    const info: BuildInfo = {
      hash: sha256('hello'),
      mtime: Date.now(),
      status: 'ok',
    }
    expect(typeof info.hash).toBe('string')
    expect(typeof info.mtime).toBe('number')
    expect(info.status).toBe('ok')
  })

  it('status can be ok | error | blocked', () => {
    const statuses: FileStatus[] = ['ok', 'error', 'blocked']
    expect(statuses).toHaveLength(3)
  })
})

// ── Watcher.hashContent ───────────────────────────────────────────────────────

describe('Watcher.hashContent()', () => {
  it('returns a non-empty hex string', () => {
    const w = new Watcher('/tmp/test-proj', '/tmp/test-out')
    const h = w.hashContent('const x = 1')
    expect(typeof h).toBe('string')
    expect(h.length).toBeGreaterThan(0)
  })

  it('returns same hash for same content', () => {
    const w = new Watcher('/tmp/test-proj', '/tmp/test-out')
    expect(w.hashContent('abc')).toBe(w.hashContent('abc'))
  })

  it('returns different hash for different content', () => {
    const w = new Watcher('/tmp/test-proj', '/tmp/test-out')
    expect(w.hashContent('abc')).not.toBe(w.hashContent('def'))
  })
})

// ── Watcher.hasChanged ────────────────────────────────────────────────────────

describe('Watcher.hasChanged()', () => {
  it('returns true when file has no prior BuildInfo', () => {
    const w = new Watcher('/tmp/test-proj', '/tmp/test-out')
    expect(w.hasChanged('/p/a.sjs', 'content')).toBe(true)
  })

  it('returns false when content hash matches prior BuildInfo', () => {
    const w = new Watcher('/tmp/test-proj', '/tmp/test-out')
    const content = 'const x = 1'
    w.recordBuild('/p/a.sjs', content, 'ok')
    expect(w.hasChanged('/p/a.sjs', content)).toBe(false)
  })

  it('returns true when content hash changed', () => {
    const w = new Watcher('/tmp/test-proj', '/tmp/test-out')
    w.recordBuild('/p/a.sjs', 'old content', 'ok')
    expect(w.hasChanged('/p/a.sjs', 'new content')).toBe(true)
  })
})

// ── Watcher.recordBuild ───────────────────────────────────────────────────────

describe('Watcher.recordBuild()', () => {
  it('stores BuildInfo for a file', () => {
    const w = new Watcher('/tmp/test-proj', '/tmp/test-out')
    w.recordBuild('/p/a.sjs', 'src', 'ok')
    const info = w.getBuildInfo('/p/a.sjs')
    expect(info).not.toBeNull()
    expect(info!.status).toBe('ok')
    expect(info!.hash).toBe(w.hashContent('src'))
  })

  it('overwrites prior BuildInfo on second call', () => {
    const w = new Watcher('/tmp/test-proj', '/tmp/test-out')
    w.recordBuild('/p/a.sjs', 'v1', 'ok')
    w.recordBuild('/p/a.sjs', 'v2', 'error')
    const info = w.getBuildInfo('/p/a.sjs')
    expect(info!.status).toBe('error')
    expect(info!.hash).toBe(w.hashContent('v2'))
  })
})

// ── Watcher.computeDirtySet ───────────────────────────────────────────────────

describe('Watcher.computeDirtySet()', () => {
  it('returns changed file and all transitive dependents', () => {
    const w = new Watcher('/tmp/test-proj', '/tmp/test-out')
    // A ← B ← C  (B imports A, C imports B)
    w.updateImports('/p/a.sjs', [])
    w.updateImports('/p/b.sjs', ['/p/a.sjs'])
    w.updateImports('/p/c.sjs', ['/p/b.sjs'])

    const dirty = w.computeDirtySet('/p/a.sjs')
    expect(dirty).toContain('/p/a.sjs')
    expect(dirty).toContain('/p/b.sjs')
    expect(dirty).toContain('/p/c.sjs')
  })

  it('returns only the changed file when it has no dependents', () => {
    const w = new Watcher('/tmp/test-proj', '/tmp/test-out')
    w.updateImports('/p/leaf.sjs', ['/p/a.sjs'])
    const dirty = w.computeDirtySet('/p/leaf.sjs')
    expect(dirty).toEqual(['/p/leaf.sjs'])
  })
})

// ── Watcher.sortDirty ─────────────────────────────────────────────────────────

describe('Watcher.sortDirty()', () => {
  it('returns files in dependency-first order', () => {
    const w = new Watcher('/tmp/test-proj', '/tmp/test-out')
    w.updateImports('/p/a.sjs', [])
    w.updateImports('/p/b.sjs', ['/p/a.sjs'])
    w.updateImports('/p/c.sjs', ['/p/b.sjs'])

    const result = w.sortDirty(['/p/a.sjs', '/p/b.sjs', '/p/c.sjs'])
    expect(result.cycles).toHaveLength(0)
    const { order } = result
    expect(order.indexOf('/p/a.sjs')).toBeLessThan(order.indexOf('/p/b.sjs'))
    expect(order.indexOf('/p/b.sjs')).toBeLessThan(order.indexOf('/p/c.sjs'))
  })

  it('returns cycle diagnostic for circular imports', () => {
    const w = new Watcher('/tmp/test-proj', '/tmp/test-out')
    w.updateImports('/p/a.sjs', ['/p/b.sjs'])
    w.updateImports('/p/b.sjs', ['/p/a.sjs'])

    const result = w.sortDirty(['/p/a.sjs', '/p/b.sjs'])
    expect(result.cycles.length).toBeGreaterThan(0)
    expect(result.cycles[0].diagnostic.code).toBe('SJS-E004')
  })

  it('marks cycle nodes as blocked in BuildInfo', () => {
    const w = new Watcher('/tmp/test-proj', '/tmp/test-out')
    w.updateImports('/p/a.sjs', ['/p/b.sjs'])
    w.updateImports('/p/b.sjs', ['/p/a.sjs'])
    w.recordBuild('/p/a.sjs', 'src-a', 'ok')
    w.recordBuild('/p/b.sjs', 'src-b', 'ok')

    w.sortDirty(['/p/a.sjs', '/p/b.sjs'])
    expect(w.getBuildInfo('/p/a.sjs')!.status).toBe('blocked')
    expect(w.getBuildInfo('/p/b.sjs')!.status).toBe('blocked')
  })
})
