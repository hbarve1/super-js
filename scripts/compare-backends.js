#!/usr/bin/env node
/**
 * Cross-backend validation script — T058
 *
 * Validates the compiler/ JS backend against the prototype/ Babel backend
 * on the golden-file test suite and all examples.
 *
 * Current comparison levels:
 *   Level 1 — Lexical:  both backends tokenise the file without error.
 *   Level 2 — Compile:  prototype compiles the file to valid JS.
 *   Level 3 — Output:   (pending) once compiler/ has codegen, compare outputs.
 *
 * Usage:
 *   node scripts/compare-backends.js              # run on golden + examples
 *   node scripts/compare-backends.js --json       # machine-readable ndjson
 *   node scripts/compare-backends.js --verbose    # show per-file details
 */

const { execSync, spawnSync } = require('child_process')
const { readFileSync, readdirSync, statSync, mkdirSync, rmSync, existsSync } = require('fs')
const { join, resolve } = require('path')
const os = require('os')

const ROOT = resolve(__dirname, '..')
const PROTOTYPE_DIR = join(ROOT, 'prototype')
const COMPILER_DIR = join(ROOT, 'compiler')

const args = process.argv.slice(2)
const JSON_OUTPUT = args.includes('--json')
const VERBOSE = args.includes('--verbose')

// ── Collect .sjs files ────────────────────────────────────────────────────────

function findSjs(dir) {
  const results = []
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (entry.endsWith('.sjs')) results.push(full)
    }
  }
  walk(dir)
  return results
}

const goldenFixtures = findSjs(join(PROTOTYPE_DIR, 'tests/golden/fixtures'))
const exampleFiles  = findSjs(join(ROOT, 'examples'))
const corpus = [...goldenFixtures, ...exampleFiles]

// ── Backend 1: prototype (Babel) — run as subprocess ─────────────────────────

// Inline runner script so we don't need a separate helper file
function runPrototype(file) {
  // Use ts-node to run the compile function inside the prototype directory
  // so that all Babel plugins resolve correctly against prototype/node_modules.
  const tsNodeBin = join(PROTOTYPE_DIR, 'node_modules/.bin/ts-node')
  const script = `
    const { compile } = require('./src/compiler');
    const os = require('os'), fs = require('fs'), path = require('path');
    const tmp = path.join(os.tmpdir(), 'sjs-cmp-' + Date.now());
    fs.mkdirSync(tmp, { recursive: true });
    compile({ sourceFile: process.argv[1], outDir: tmp, sourceRoot: process.cwd(), silent: true })
      .then(() => { try { fs.rmSync(tmp, { recursive: true, force: true }) } catch {} })
      .catch(e => { try { fs.rmSync(tmp, { recursive: true, force: true }) } catch {} process.stderr.write(e.message); process.exit(1); });
  `
  const result = spawnSync(
    tsNodeBin,
    ['--transpile-only', '-e', script, '--', file],
    { cwd: PROTOTYPE_DIR, encoding: 'utf-8', timeout: 20000 },
  )
  if (result.status === 0) return { ok: true }
  const msg = (result.stderr || result.error?.message || 'unknown error').trim().split('\n')[0]
  return { ok: false, error: msg }
}

// ── Backend 2: compiler/ (JS — lexer stage) ───────────────────────────────────

let CompilerLexer = null
try {
  CompilerLexer = require(join(COMPILER_DIR, 'src/lexer/lexer.js'))
} catch {
  // compiler/ backend not installed or not present — skip
}

function runCompilerLexer(file) {
  if (!CompilerLexer) return { ok: null, note: 'compiler/ backend not available' }
  try {
    const src = readFileSync(file, 'utf-8')
    const lexer = new CompilerLexer(src)
    const tokens = lexer.tokenize()
    return { ok: true, tokens: tokens.length }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── Run and report ────────────────────────────────────────────────────────────

;(async () => {
  const results = []

  for (const file of corpus) {
    const rel = file.replace(ROOT + '/', '')
    const proto  = runPrototype(file)
    const lexer  = runCompilerLexer(file)
    const result = { file: rel, prototype: proto, compilerLexer: lexer }
    results.push(result)

    if (JSON_OUTPUT) {
      process.stdout.write(JSON.stringify(result) + '\n')
    } else if (VERBOSE) {
      const pIcon = proto.ok ? '✓' : '✗'
      const lIcon = lexer.ok === true ? '✓' : lexer.ok === null ? '–' : '✗'
      console.log(`[proto:${pIcon}] [lex:${lIcon}] ${rel}`)
      if (!proto.ok) console.log(`    prototype: ${proto.error?.split('\n')[0]}`)
      if (lexer.ok === false) console.log(`    lexer: ${lexer.error}`)
    }
  }

  if (!JSON_OUTPUT) {
    const protoPass = results.filter(r => r.prototype.ok).length
    const protoFail = results.filter(r => !r.prototype.ok).length
    const lexPass   = results.filter(r => r.compilerLexer.ok === true).length
    const lexFail   = results.filter(r => r.compilerLexer.ok === false).length
    const lexSkip   = results.filter(r => r.compilerLexer.ok === null).length

    console.log('')
    console.log('═══════════════════════════════════════════')
    console.log(' Cross-Backend Validation Report')
    console.log('═══════════════════════════════════════════')
    console.log(` Files in corpus:     ${corpus.length}`)
    console.log(` Prototype (Babel):   ${protoPass} pass / ${protoFail} fail`)
    console.log(` compiler/ (lexer):   ${lexPass} pass / ${lexFail} fail${lexSkip ? ` / ${lexSkip} n/a` : ''}`)
    console.log('')
    console.log(' Level 3 (output comparison) is pending:')
    console.log(' compiler/ codegen is not yet implemented.')
    console.log(' Once compiler/src/codegen emits .js output,')
    console.log(' add a Level 3 check here to diff prototype')
    console.log(' and compiler/ outputs on each golden fixture.')
    console.log('═══════════════════════════════════════════')

    if (protoFail > 0) {
      console.log('\nPrototype failures:')
      results.filter(r => !r.prototype.ok).forEach(r => {
        console.log(`  ✗ ${r.file}`)
        if (r.prototype.error) console.log(`      ${r.prototype.error.split('\n')[0]}`)
      })
    }
    if (lexFail > 0) {
      console.log('\nLexer failures:')
      results.filter(r => r.compilerLexer.ok === false).forEach(r => {
        console.log(`  ✗ ${r.file}`)
        console.log(`      ${r.compilerLexer.error}`)
      })
    }

    process.exit(protoFail > 0 ? 1 : 0)
  }
})()
