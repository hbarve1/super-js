/**
 * Super.js Linter — T040/T041
 *
 * Rules implemented:
 *
 *   SJS-L001  prefer-const
 *     A `let` binding that is never reassigned should be `const`.
 *     ECMA-262 §14.3.1 — Let and Const Declarations
 *     https://tc39.es/ecma262/#sec-let-and-const-declarations
 *
 *   SJS-W002  no-unused-var
 *     A declared variable that is never read is dead code.
 *     Exception: identifiers starting with `_` are intentionally unused.
 *
 *   SJS-W003  no-unused-import
 *     An import specifier that is never referenced in the file body.
 *     ECMA-262 §16.2.2 — Imports
 *     https://tc39.es/ecma262/#sec-imports
 */

import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import type { LintDiagnostic } from './types'

export type { LintDiagnostic } from './types'

// ── lintSource ────────────────────────────────────────────────────────────────

export async function lintSource(source: string): Promise<LintDiagnostic[]> {
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  })

  const diagnostics: LintDiagnostic[] = []

  // ── Tracking maps ───────────────────────────────────────────────────────────

  /** All let-declared names → declaration node */
  const letDecls = new Map<string, t.VariableDeclarator>()
  /** All declared names (let + const) → declaration node */
  const allDecls = new Map<string, t.VariableDeclarator>()
  /** Names that have been reassigned (via AssignmentExpression) */
  const reassigned = new Set<string>()
  /** Names that have been READ (referenced as an Identifier in non-LHS position) */
  const referenced = new Set<string>()
  /** Import specifiers → import specifier node */
  const importedNames = new Map<string, t.ImportSpecifier | t.ImportDefaultSpecifier>()
  /** Set of names referenced outside their import declaration */
  const importReferenced = new Set<string>()

  // ── Pass 1: collect declarations and references ─────────────────────────────

  traverse(ast, {
    // Collect variable declarations — ECMA-262 §14.3
    VariableDeclaration(path) {
      for (const decl of path.node.declarations) {
        if (!t.isIdentifier(decl.id)) continue
        const name = decl.id.name
        allDecls.set(name, decl)
        if (path.node.kind === 'let') {
          letDecls.set(name, decl)
        }
      }
    },

    // Collect import specifiers — ECMA-262 §16.2.2
    ImportDeclaration(path) {
      for (const spec of path.node.specifiers) {
        if (t.isImportSpecifier(spec) || t.isImportDefaultSpecifier(spec)) {
          importedNames.set(spec.local.name, spec)
        }
      }
    },

    // Collect assignments (to detect let reassignment) — ECMA-262 §13.15
    AssignmentExpression(path) {
      if (t.isIdentifier(path.node.left)) {
        reassigned.add((path.node.left as t.Identifier).name)
      }
    },

    // Also handle update expressions: x++ / x-- count as reassignment
    UpdateExpression(path) {
      if (t.isIdentifier(path.node.argument)) {
        reassigned.add((path.node.argument as t.Identifier).name)
      }
    },

    // Collect references (reads) — skip the declaration LHS itself
    Identifier(path) {
      const { name } = path.node

      // Skip the binding site of a declaration
      if (
        path.parent.type === 'VariableDeclarator' &&
        (path.parent as t.VariableDeclarator).id === path.node
      ) return

      // Skip the LHS of an assignment (that's a write, not a read)
      if (
        path.parent.type === 'AssignmentExpression' &&
        (path.parent as t.AssignmentExpression).left === path.node
      ) return

      // Skip import local bindings themselves
      if (
        path.parent.type === 'ImportSpecifier' ||
        path.parent.type === 'ImportDefaultSpecifier' ||
        path.parent.type === 'ImportNamespaceSpecifier'
      ) return

      // Skip type-only positions (TSTypeReference, etc.)
      if (
        path.parent.type === 'TSTypeReference' ||
        path.parent.type === 'TSTypeAnnotation' ||
        path.parent.type === 'TSPropertySignature'
      ) return

      referenced.add(name)

      if (importedNames.has(name)) {
        importReferenced.add(name)
      }
    },
  })

  // ── Pass 2: emit diagnostics ────────────────────────────────────────────────

  // SJS-L001: prefer-const — let never reassigned
  for (const [name, decl] of letDecls) {
    if (reassigned.has(name)) continue
    const loc = decl.id.loc?.start
    diagnostics.push({
      code: 'SJS-L001',
      severity: 'warning',
      message: `'${name}' is never reassigned. Use 'const' instead of 'let'.`,
      line: loc?.line ?? 0,
      column: loc?.column ?? 0,
      fix: { description: `Change 'let ${name}' to 'const ${name}'` },
    })
  }

  // SJS-W002: no-unused-var — declared but never read
  for (const [name, decl] of allDecls) {
    if (name.startsWith('_')) continue        // underscore prefix = intentionally unused
    if (referenced.has(name)) continue
    const loc = decl.id.loc?.start
    diagnostics.push({
      code: 'SJS-W002',
      severity: 'warning',
      message: `'${name}' is declared but never used.`,
      line: loc?.line ?? 0,
      column: loc?.column ?? 0,
    })
  }

  // SJS-W003: no-unused-import — imported but never referenced
  for (const [name, spec] of importedNames) {
    if (importReferenced.has(name)) continue
    const loc = spec.local.loc?.start
    diagnostics.push({
      code: 'SJS-W003',
      severity: 'warning',
      message: `'${name}' is imported but never used.`,
      line: loc?.line ?? 0,
      column: loc?.column ?? 0,
    })
  }

  return diagnostics
}

// ── LintOptions / lint (for CLI) ──────────────────────────────────────────────

export interface LintOptions {
  fix?: boolean
  sourceFile?: string
  directory?: string
  json?: boolean
  silent?: boolean
}

function findSjsFilesLinter(dir: string): string[] {
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

export async function lint(options: LintOptions = {}): Promise<LintDiagnostic[]> {
  const { sourceFile, directory, json = false, silent = false } = options
  const log = silent ? () => {} : console.log.bind(console)

  if (directory) {
    const { resolve } = await import('path')
    const resolvedDir = resolve(process.cwd(), directory)
    const files = findSjsFilesLinter(resolvedDir)
    const allDiags: LintDiagnostic[] = []

    for (const file of files) {
      const source = readFileSync(file, 'utf-8')
      const diags = await lintSource(source)
      for (const d of diags) {
        if (json) {
          process.stdout.write(
            JSON.stringify({ file, code: d.code, severity: d.severity, message: d.message, line: d.line, column: d.column }) + '\n'
          )
        } else {
          log(`${d.severity}[${d.code}]: ${d.message} (${file}:${d.line}:${d.column})`)
        }
        allDiags.push(d)
      }
    }
    return allDiags
  }

  if (!sourceFile) {
    log('No source file specified.')
    return []
  }

  const source = readFileSync(sourceFile, 'utf-8')
  const diags = await lintSource(source)

  for (const d of diags) {
    if (json) {
      process.stdout.write(
        JSON.stringify({ file: sourceFile, code: d.code, severity: d.severity, message: d.message, line: d.line, column: d.column }) + '\n'
      )
    } else {
      log(`${d.severity}[${d.code}]: ${d.message} (${sourceFile}:${d.line}:${d.column})`)
    }
  }

  return diags
}
