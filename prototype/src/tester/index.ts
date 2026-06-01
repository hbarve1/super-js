/**
 * Super.js test runner — T043/T044
 *
 * Discovery: globs **\/*.test.sjs and **\/*.spec.sjs in a given directory.
 * Execution: compiles each file to a temp dir, runs it with Node.js.
 * Result: a file exits 0 = pass; non-zero or thrown = fail.
 *
 * Tests use Node.js built-in `assert` module for assertions.
 */

import { execSync } from 'child_process'
import { mkdirSync, rmSync } from 'fs'
import { join, basename, resolve, relative } from 'path'
import { tmpdir } from 'os'
import glob from 'fast-glob'
import { compile } from '../compiler'

// ── Result types ──────────────────────────────────────────────────────────────

export interface TestFileResult {
  name: string
  path: string
  passed: boolean
  error?: string
  durationMs: number
}

export interface TestRunResult {
  total: number
  passed: number
  failed: number
  files: TestFileResult[]
  durationMs: number
}

export interface TestRunOptions {
  directory?: string
  pattern?: string
  silent?: boolean
  watch?: boolean
  coverage?: boolean
}

// ── runTests ──────────────────────────────────────────────────────────────────

export async function runTests(options: TestRunOptions = {}): Promise<TestRunResult> {
  const {
    directory = process.cwd(),
    pattern,
    silent = false,
    watch = false,
    coverage = false,
  } = options

  const log = silent ? (..._: unknown[]) => {} : console.log.bind(console)

  if (watch) log('Watch mode: running once (full watch coming in v2)')
  if (coverage) log('Coverage: not yet implemented')

  const runStart = Date.now()
  const absDir = resolve(directory)

  const globs = pattern ? [pattern] : ['**/*.test.sjs', '**/*.spec.sjs']
  const files = await glob(globs, {
    cwd: absDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**'],
  })

  if (files.length === 0) {
    return { total: 0, passed: 0, failed: 0, files: [], durationMs: Date.now() - runStart }
  }

  log(`Found ${files.length} test file(s)`)

  const results: TestFileResult[] = []

  for (const file of files) {
    const start = Date.now()
    const r = await runTestFile(file, absDir)
    results.push({ ...r, durationMs: Date.now() - start })
    log(r.passed ? `  ✓ ${r.name}` : `  ✗ ${r.name}`)
    if (!r.passed && r.error) log(`    ${r.error.split('\n')[0]}`)
  }

  const passed = results.filter(r => r.passed).length

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    files: results,
    durationMs: Date.now() - runStart,
  }
}

// ── runTestFile ───────────────────────────────────────────────────────────────

async function runTestFile(
  file: string,
  sourceRoot: string,
): Promise<Omit<TestFileResult, 'durationMs'>> {
  const name = basename(file)
  const tmpDir = join(tmpdir(), `sjs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)

  try {
    mkdirSync(tmpDir, { recursive: true })

    await compile({ sourceFile: file, outDir: tmpDir, sourceRoot, silent: true })

    const outFile = join(tmpDir, relative(sourceRoot, file).replace(/\.sjs$/, '.js'))
    execSync(`node "${outFile}"`, { stdio: 'pipe', timeout: 10_000 })

    return { name, path: file, passed: true }
  } catch (err: unknown) {
    type ExecErr = Error & { stderr?: Buffer }
    const e = err as ExecErr
    const stderr = e.stderr ? e.stderr.toString().trim() : ''
    const error = stderr || e.message || String(err)
    return { name, path: file, passed: false, error }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}
