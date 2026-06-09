import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

// Root examples dir is one level above the website package
const EXAMPLES_DIR = join(process.cwd(), '..', 'examples')

export interface SjsExample {
  slug: string       // e.g. "basics/hello-world"
  category: string   // e.g. "basics"
  name: string       // e.g. "hello-world"
  code: string
}

function walk(dir: string, base: string, out: SjsExample[]) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full, base, out)
    } else if (entry.endsWith('.sjs') && !entry.endsWith('.test.sjs')) {
      const rel = relative(base, full).replace(/\.sjs$/, '')
      const parts = rel.split('/')
      out.push({
        slug: rel,
        category: parts[0],
        name: parts.slice(1).join('/') || parts[0],
        code: readFileSync(full, 'utf8'),
      })
    }
  }
}

export function getAllExamples(): SjsExample[] {
  const out: SjsExample[] = []
  walk(EXAMPLES_DIR, EXAMPLES_DIR, out)
  return out.sort((a, b) => a.slug.localeCompare(b.slug))
}

export function getExamplesByCategory(): Record<string, SjsExample[]> {
  const all = getAllExamples()
  return all.reduce<Record<string, SjsExample[]>>((acc, ex) => {
    ;(acc[ex.category] ??= []).push(ex)
    return acc
  }, {})
}

export function getExample(slug: string): SjsExample | undefined {
  return getAllExamples().find(e => e.slug === slug)
}
