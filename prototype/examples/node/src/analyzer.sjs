// Code statistics analyzer — walks a directory and aggregates line counts per file

import { readLines, walkDir, getExtension, formatBytes } from './fs-utils'
import fs from 'fs'

type AnalysisResult<T> = | Success(T) | Failure(string)

interface FileStats {
  path: string
  extension: string
  totalLines: number
  codeLines: number
  commentLines: number
  blankLines: number
  sizeBytes: number
}

interface ProjectStats {
  directory: string
  totalFiles: number
  totalLines: number
  codeLines: number
  commentLines: number
  blankLines: number
  byExtension: Map<string, { files: number, lines: number }>
  topFiles: FileStats[]
  analyzedAt: number
}

// Single-line comment prefixes recognised across common languages
const COMMENT_PREFIXES: string[] = ['//', '#', '--', ';', '%', '*']

function isCommentLine(line: string): boolean {
  const trimmed: string = line.trim()
  if (trimmed.length === 0) return false
  for (const prefix of COMMENT_PREFIXES) {
    if (trimmed.startsWith(prefix)) return true
  }
  // Block comment markers
  if (trimmed.startsWith('/*') || trimmed.startsWith('*/') || trimmed.startsWith('*')) return true
  return false
}

function getFileSizeBytes(filePath: string): number {
  try {
    const stat: fs.Stats = fs.statSync(filePath)
    return stat.size
  } catch (e: dynamic) {
    return 0
  }
}

function analyzeFile(filePath: string): FileStats {
  const lines: string[] = readLines(filePath)
  const ext: string = getExtension(filePath)
  const sizeBytes: number = getFileSizeBytes(filePath)

  let blankLines: number = 0
  let commentLines: number = 0
  let codeLines: number = 0

  for (const line of lines) {
    const trimmed: string = line.trim()
    if (trimmed.length === 0) {
      blankLines++
    } else if (isCommentLine(line)) {
      commentLines++
    } else {
      codeLines++
    }
  }

  return {
    path: filePath,
    extension: ext,
    totalLines: lines.length,
    codeLines,
    commentLines,
    blankLines,
    sizeBytes,
  }
}

function analyzeDirectory(dir: string, extensions: string[]): ProjectStats {
  const files: string[] = walkDir(dir, { extensions, maxDepth: 20 })

  let totalLines: number = 0
  let codeLines: number = 0
  let commentLines: number = 0
  let blankLines: number = 0

  const byExtension: Map<string, { files: number, lines: number }> = new Map()
  const fileStats: FileStats[] = []

  for (const filePath of files) {
    const stats: FileStats = analyzeFile(filePath)
    fileStats.push(stats)

    totalLines += stats.totalLines
    codeLines += stats.codeLines
    commentLines += stats.commentLines
    blankLines += stats.blankLines

    const ext: string = stats.extension || '(none)'
    const existing: { files: number, lines: number } = byExtension.get(ext) || { files: 0, lines: 0 }
    byExtension.set(ext, {
      files: existing.files + 1,
      lines: existing.lines + stats.totalLines,
    })
  }

  // Sort by total lines descending, take top 10
  const topFiles: FileStats[] = fileStats
    .slice()
    .sort((a, b) => b.totalLines - a.totalLines)
    .slice(0, 10)

  return {
    directory: dir,
    totalFiles: files.length,
    totalLines,
    codeLines,
    commentLines,
    blankLines,
    byExtension,
    topFiles,
    analyzedAt: Date.now(),
  }
}

export { analyzeFile, analyzeDirectory, FileStats, ProjectStats }
