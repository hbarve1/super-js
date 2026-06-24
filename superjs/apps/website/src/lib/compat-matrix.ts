import fs from 'node:fs'
import path from 'node:path'

export interface CompatRow {
  package: string
  wrapper: string
  coverage: number
  status: string
  version: string
  licenseCompat: string
  esm: boolean
  cjs: boolean
  lastUpdated: string
  features: string[]
  missing: string[]
}

export interface CompatMatrixData {
  generatedAt: string
  count: number
  rows: CompatRow[]
}

const MATRIX_PATH = path.join(process.cwd(), '..', '..', '..', 'docs', 'compat', 'matrix.json')

export function loadCompatMatrix(): CompatMatrixData {
  const raw = fs.readFileSync(MATRIX_PATH, 'utf-8')
  return JSON.parse(raw) as CompatMatrixData
}

/** Strip the auto-generated markdown table — website renders an interactive table instead. */
export function stripGeneratedTable(content: string): string {
  const begin = '<!-- AUTO-GENERATED:BEGIN -->'
  const end = '<!-- AUTO-GENERATED:END -->'
  const start = content.indexOf(begin)
  if (start === -1) return content
  const finish = content.indexOf(end, start)
  if (finish === -1) return content
  return `${content.slice(0, start).trimEnd()}\n\n${content.slice(finish + end.length).trimStart()}`
}
