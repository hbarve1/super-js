// Output formatters — human-readable table and JSON modes

import { ProjectStats } from './analyzer'
import { formatBytes } from './fs-utils'

const BAR_FILL: string = '█'
const BAR_EMPTY: string = '░'

function formatBar(value: number, max: number, width: number): string {
  if (max === 0) return '[' + BAR_EMPTY.repeat(width) + ']'
  const filled: number = Math.round((value / max) * width)
  const empty: number = width - filled
  return '[' + BAR_FILL.repeat(filled) + BAR_EMPTY.repeat(empty) + ']'
}

function pad(str: string, len: number): string {
  if (str.length >= len) return str.slice(0, len)
  return str + ' '.repeat(len - str.length)
}

function rpad(str: string, len: number): string {
  const s: string = String(str)
  if (s.length >= len) return s.slice(0, len)
  return ' '.repeat(len - s.length) + s
}

function formatStats(stats: ProjectStats): string {
  const lines: string[] = []
  const hr: string = '─'.repeat(60)

  lines.push('')
  lines.push('  Code Statistics Report')
  lines.push('  ' + hr)
  lines.push(`  Directory : ${stats.directory}`)
  lines.push(`  Analyzed  : ${new Date(stats.analyzedAt).toISOString()}`)
  lines.push('  ' + hr)
  lines.push('')

  // Summary block
  lines.push('  SUMMARY')
  lines.push('')
  lines.push(`    Total files    : ${stats.totalFiles}`)
  lines.push(`    Total lines    : ${stats.totalLines}`)
  lines.push(`    Code lines     : ${stats.codeLines}`)
  lines.push(`    Comment lines  : ${stats.commentLines}`)
  lines.push(`    Blank lines    : ${stats.blankLines}`)
  lines.push('')

  // Code vs comment vs blank bars
  const barWidth: number = 30
  const maxVal: number = Math.max(stats.codeLines, stats.commentLines, stats.blankLines, 1)

  lines.push('  LINE BREAKDOWN')
  lines.push('')
  lines.push(`    Code     ${formatBar(stats.codeLines, maxVal, barWidth)}  ${rpad(stats.codeLines, 6)}`)
  lines.push(`    Comments ${formatBar(stats.commentLines, maxVal, barWidth)}  ${rpad(stats.commentLines, 6)}`)
  lines.push(`    Blank    ${formatBar(stats.blankLines, maxVal, barWidth)}  ${rpad(stats.blankLines, 6)}`)
  lines.push('')

  // By extension
  if (stats.byExtension.size > 0) {
    lines.push('  BY EXTENSION')
    lines.push('')
    lines.push(`    ${'Ext'.padEnd(10)} ${'Files'.padStart(6)} ${'Lines'.padStart(8)}  Distribution`)
    lines.push(`    ${'─'.repeat(10)} ${'─'.repeat(6)} ${'─'.repeat(8)}  ${'─'.repeat(barWidth + 2)}`)

    const maxLines: number = Math.max(...Array.from(stats.byExtension.values()).map(v => v.lines), 1)

    const sortedExts: [string, { files: number, lines: number }][] = Array.from(stats.byExtension.entries())
      .sort((a, b) => b[1].lines - a[1].lines)

    for (const [ext, data] of sortedExts) {
      const bar: string = formatBar(data.lines, maxLines, barWidth)
      lines.push(`    ${pad(ext, 10)} ${rpad(data.files, 6)} ${rpad(data.lines, 8)}  ${bar}`)
    }
    lines.push('')
  }

  // Top files
  if (stats.topFiles.length > 0) {
    lines.push('  TOP FILES BY LINE COUNT')
    lines.push('')
    lines.push(`    ${'File'.padEnd(40)} ${'Lines'.padStart(6)}  ${'Size'.padStart(8)}`)
    lines.push(`    ${'─'.repeat(40)} ${'─'.repeat(6)}  ${'─'.repeat(8)}`)

    for (const file of stats.topFiles) {
      // Show only the last 38 chars of the path to keep it tidy
      let displayPath: string = file.path
      if (displayPath.length > 40) {
        displayPath = '…' + displayPath.slice(displayPath.length - 39)
      }
      lines.push(`    ${pad(displayPath, 40)} ${rpad(file.totalLines, 6)}  ${rpad(formatBytes(file.sizeBytes), 8)}`)
    }
    lines.push('')
  }

  lines.push('  ' + hr)
  lines.push('')

  return lines.join('\n')
}

function formatStatsJson(stats: ProjectStats): string {
  // Map is not JSON-serialisable by default — convert to plain object
  const byExtObj: Record<string, { files: number, lines: number }> = {}
  for (const [ext, data] of stats.byExtension.entries()) {
    byExtObj[ext] = data
  }

  const serialisable: Record<string, unknown> = {
    directory: stats.directory,
    totalFiles: stats.totalFiles,
    totalLines: stats.totalLines,
    codeLines: stats.codeLines,
    commentLines: stats.commentLines,
    blankLines: stats.blankLines,
    byExtension: byExtObj,
    topFiles: stats.topFiles,
    analyzedAt: stats.analyzedAt,
  }

  return JSON.stringify(serialisable, null, 2)
}

export { formatStats, formatStatsJson, formatBar }
