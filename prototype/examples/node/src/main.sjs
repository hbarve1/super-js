// CLI entry point — parse arguments, run analysis, print report

import process from 'process'
import path from 'path'
import { analyzeDirectory, ProjectStats } from './analyzer'
import { formatStats, formatStatsJson } from './formatter'

interface CliOptions {
  directory: string
  json: boolean
  top: number
  extensions: string[]
}

function printUsage(): void {
  process.stdout.write([
    '',
    '  Usage: node dist/main.js [directory] [options]',
    '',
    '  Options:',
    '    --json          Output raw JSON instead of a formatted report',
    '    --top <N>       Show top N files by line count  (default: 10)',
    '    --ext <a,b,...> Only count files with these extensions (e.g. js,ts,sjs)',
    '    --help          Show this help message',
    '',
  ].join('\n'))
}

function parseArgs(args: string[]): CliOptions {
  let directory: string = process.cwd()
  let json: boolean = false
  let top: number = 10
  let extensions: string[] = []

  let i: number = 0

  // First positional argument (if it does not start with --) is the directory
  if (args.length > 0 && !args[0].startsWith('--')) {
    directory = path.resolve(args[0])
    i = 1
  }

  while (i < args.length) {
    const flag: string = args[i]

    if (flag === '--json') {
      json = true
      i++
    } else if (flag === '--help' || flag === '-h') {
      printUsage()
      process.exit(0)
    } else if (flag === '--top') {
      const raw: string = args[i + 1] || ''
      const parsed: number = parseInt(raw, 10)
      if (isNaN(parsed) || parsed < 1) {
        process.stderr.write(`  Error: --top requires a positive integer, got "${raw}"\n`)
        process.exit(1)
      }
      top = parsed
      i += 2
    } else if (flag === '--ext') {
      const raw: string = args[i + 1] || ''
      extensions = raw.split(',').map((e: string) => (e.startsWith('.') ? e : '.' + e))
      i += 2
    } else {
      process.stderr.write(`  Warning: unknown flag "${flag}" — ignored\n`)
      i++
    }
  }

  return { directory, json, top, extensions }
}

function main(args: string[]): void {
  const opts: CliOptions = parseArgs(args)

  try {
    const stats: ProjectStats = analyzeDirectory(opts.directory, opts.extensions)

    // Respect --top: trim topFiles to the requested count
    if (opts.top !== 10) {
      stats.topFiles = stats.topFiles.slice(0, opts.top)
    }

    if (opts.json) {
      process.stdout.write(formatStatsJson(stats) + '\n')
    } else {
      process.stdout.write(formatStats(stats))
    }
  } catch (err) {
    const message: string = err instanceof Error ? err.message : String(err)
    process.stderr.write(`  Error: ${message}\n`)
    process.exit(1)
  }
}

main(process.argv.slice(2))
