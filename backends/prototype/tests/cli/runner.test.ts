/**
 * Test runner tests — T043/T044
 *
 * Discovers *.test.sjs files, compiles them, executes with Node.js.
 * Uses Node's built-in `assert` module for test assertions.
 * A file exiting 0 = pass; non-zero = fail.
 */

import { runTests } from '../../src/tester'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join, resolve } from 'path'

const TMP = resolve(__dirname, '../__runner_tmp__')
beforeEach(() => mkdirSync(TMP, { recursive: true }))
afterEach(() => rmSync(TMP, { recursive: true, force: true }))

function write(name: string, src: string): string {
  const p = join(TMP, name)
  writeFileSync(p, src)
  return p
}

// ── Discovery ─────────────────────────────────────────────────────────────────

describe('runTests() — discovery', () => {
  it('finds *.test.sjs files in the given directory', async () => {
    write('math.test.sjs', 'import assert from "assert"\nassert.strictEqual(1 + 1, 2)')
    const results = await runTests({ directory: TMP })
    expect(results.total).toBe(1)
  })

  it('finds *.spec.sjs files too', async () => {
    write('app.spec.sjs', 'import assert from "assert"\nassert.ok(true)')
    const results = await runTests({ directory: TMP })
    expect(results.total).toBe(1)
  })

  it('ignores non-test .sjs files', async () => {
    write('helper.sjs', 'export const x = 1')
    write('main.test.sjs', 'import assert from "assert"\nassert.ok(true)')
    const results = await runTests({ directory: TMP })
    expect(results.total).toBe(1)
  })

  it('returns zero total when no test files found', async () => {
    const results = await runTests({ directory: TMP })
    expect(results.total).toBe(0)
    expect(results.passed).toBe(0)
    expect(results.failed).toBe(0)
  })
})

// ── Pass / fail ───────────────────────────────────────────────────────────────

describe('runTests() — execution', () => {
  it('reports pass for a test file that exits 0', async () => {
    write('pass.test.sjs', 'import assert from "assert"\nassert.strictEqual(2 + 2, 4)')
    const results = await runTests({ directory: TMP })
    expect(results.passed).toBe(1)
    expect(results.failed).toBe(0)
  })

  it('reports fail for a test file that throws an assertion error', async () => {
    write('fail.test.sjs', 'import assert from "assert"\nassert.strictEqual(1, 2, "1 should equal 2")')
    const results = await runTests({ directory: TMP })
    expect(results.failed).toBe(1)
    expect(results.passed).toBe(0)
  })

  it('reports fail for a test file with a runtime error', async () => {
    write('error.test.sjs', 'throw new Error("boom")')
    const results = await runTests({ directory: TMP })
    expect(results.failed).toBe(1)
  })

  it('counts both pass and fail across multiple files', async () => {
    write('a.test.sjs', 'import assert from "assert"\nassert.ok(true)')
    write('b.test.sjs', 'import assert from "assert"\nassert.ok(false, "should fail")')
    write('c.test.sjs', 'import assert from "assert"\nassert.strictEqual("x","x")')
    const results = await runTests({ directory: TMP })
    expect(results.total).toBe(3)
    expect(results.passed).toBe(2)
    expect(results.failed).toBe(1)
  })
})

// ── Result structure ──────────────────────────────────────────────────────────

describe('runTests() — result shape', () => {
  it('result has total, passed, failed, files[]', async () => {
    write('ok.test.sjs', 'import assert from "assert"\nassert.ok(true)')
    const r = await runTests({ directory: TMP })
    expect(r).toHaveProperty('total')
    expect(r).toHaveProperty('passed')
    expect(r).toHaveProperty('failed')
    expect(r).toHaveProperty('files')
    expect(Array.isArray(r.files)).toBe(true)
  })

  it('each file result has name, passed, error?', async () => {
    write('ok.test.sjs', 'import assert from "assert"\nassert.ok(true)')
    const r = await runTests({ directory: TMP })
    expect(r.files[0]).toHaveProperty('name')
    expect(r.files[0]).toHaveProperty('passed')
  })

  it('failed file result includes error output', async () => {
    write('bad.test.sjs', 'throw new Error("test error message")')
    const r = await runTests({ directory: TMP })
    const failed = r.files.find(f => !f.passed)
    expect(failed?.error).toContain('test error message')
  })
})

// ── P2: Watch mode + coverage stub ───────────────────────────────────────────

describe('P2: --coverage stub', () => {
  it('logs "use `jest --coverage`" message when coverage=true', async () => {
    const logged: string[] = []
    const origLog = console.log
    console.log = (...args: unknown[]) => { logged.push(args.join(' ')) }
    try {
      await runTests({ directory: TMP, coverage: true })
    } finally {
      console.log = origLog
    }
    const combined = logged.join('\n')
    expect(combined).toContain('jest --coverage')
  })

  it('still runs tests when coverage=true', async () => {
    write('cov.test.sjs', 'import assert from "assert"\nassert.ok(true)')
    const r = await runTests({ directory: TMP, coverage: true, silent: true })
    expect(r.total).toBe(1)
    expect(r.passed).toBe(1)
  })
})

describe('P2: --watch mode', () => {
  it('runs tests initially and returns a result with watch=true', async () => {
    write('watch.test.sjs', 'import assert from "assert"\nassert.ok(true)')
    const r = await runTests({ directory: TMP, watch: true, silent: true })
    expect(r.total).toBe(1)
    expect(r.passed).toBe(1)
  })

  it('returns correct result shape in watch mode', async () => {
    write('w2.test.sjs', 'import assert from "assert"\nassert.strictEqual(1, 1)')
    const r = await runTests({ directory: TMP, watch: true, silent: true })
    expect(r).toHaveProperty('total')
    expect(r).toHaveProperty('passed')
    expect(r).toHaveProperty('failed')
    expect(r).toHaveProperty('files')
  })
})
