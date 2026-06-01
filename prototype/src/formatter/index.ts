/**
 * Super.js formatter — T038/T039
 *
 * Delegates to Prettier with the TypeScript parser (since .sjs is a TS superset).
 * Printer options follow the Super.js style guide:
 *   - 2-space indentation
 *   - Semicolons
 *   - Single quotes
 *   - Trailing commas in multi-line structures
 *   - 100-char print width
 *
 * Prettier's TypeScript parser handles JSX via the babel-ts / typescript plugins.
 */

// Prettier v3 is ESM-only; require() gives us the CJS-compatible synchronous surface.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const prettier = require('prettier') as typeof import('prettier')
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'

// ── Style guide options ───────────────────────────────────────────────────────

const PRETTIER_OPTIONS: import('prettier').Options = {
  parser: 'typescript',
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  bracketSpacing: true,
  arrowParens: 'always',
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Format a source string in-memory. Returns the formatted code. */
export async function formatSource(source: string): Promise<string> {
  return prettier.format(source, PRETTIER_OPTIONS)
}

/** Format a file in-place. */
export async function formatFile(filePath: string): Promise<void> {
  const source = readFileSync(filePath, 'utf-8')
  const formatted = await formatSource(source)
  writeFileSync(filePath, formatted)
}

/**
 * Check whether a file is already formatted.
 * Returns true if no changes would be made; false otherwise.
 */
export async function checkFormatted(filePath: string): Promise<boolean> {
  const source = readFileSync(filePath, 'utf-8')
  const formatted = await formatSource(source)
  return source === formatted
}

// ── Options type (for CLI) ────────────────────────────────────────────────────

export interface FormatOptions {
  check?: boolean
  sourceFile?: string
  directory?: string
  silent?: boolean
}

function findSjsFilesFormatter(dir: string): string[] {
  const files: string[] = []
  function walk(current: string) {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
      } else if (entry.endsWith('.sjs')) {
        files.push(full)
      }
    }
  }
  walk(dir)
  return files
}

export async function format(options: FormatOptions = {}): Promise<void> {
  const { check = false, sourceFile, directory, silent = false } = options
  const log = silent ? () => {} : console.log.bind(console)

  if (directory) {
    const resolvedDir = resolve(process.cwd(), directory)
    const files = findSjsFilesFormatter(resolvedDir)
    let formatted = 0
    let needsFormat = 0
    for (const file of files) {
      if (check) {
        const ok = await checkFormatted(file)
        if (!ok) {
          log(`${file}: needs formatting`)
          needsFormat++
        } else {
          log(`${file}: ok`)
        }
      } else {
        await formatFile(file)
        log(`Formatted ${file}`)
        formatted++
      }
    }
    if (check) {
      log(`${files.length} file(s) checked, ${needsFormat} need formatting`)
      if (needsFormat > 0) throw new Error(`${needsFormat} file(s) need formatting`)
    } else {
      log(`Formatted ${formatted} file(s)`)
    }
    return
  }

  if (!sourceFile) {
    log('No source file specified.')
    return
  }

  if (check) {
    const ok = await checkFormatted(sourceFile)
    if (!ok) {
      log(`${sourceFile}: needs formatting`)
      throw new Error(`${sourceFile} is not formatted`)
    }
    log(`${sourceFile}: ok`)
  } else {
    await formatFile(sourceFile)
    log(`Formatted ${sourceFile}`)
  }
}
