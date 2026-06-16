// Filesystem utilities — typed helpers used by the analyzer

import fs from 'fs'
import path from 'path'

type WalkOptions {
  extensions: string[]
  maxDepth: number
}

function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase()
}

function getRelativePath(filePath: string, base: string): string {
  return path.relative(base, filePath)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function readLines(filePath: string): string[] {
  try {
    const content: string = fs.readFileSync(filePath, 'utf8')
    return content.split('\n')
  } catch (err) {
    return []
  }
}

function walkDir(dir: string, options: WalkOptions, depth: number = 0): string[] {
  if (depth > options.maxDepth) return []

  let results: string[] = []

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch (err) {
    return []
  }

  for (const entry of entries) {
    // Skip hidden directories and common noise folders
    if (entry.name.startsWith('.')) continue
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue

    const fullPath: string = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      const nested: string[] = walkDir(fullPath, options, depth + 1)
      results = results.concat(nested)
    } else if (entry.isFile()) {
      const ext: string = getExtension(fullPath)
      if (options.extensions.length === 0 || options.extensions.includes(ext)) {
        results.push(fullPath)
      }
    }
  }

  return results
}

export { walkDir, readLines, getExtension, getRelativePath, formatBytes }
