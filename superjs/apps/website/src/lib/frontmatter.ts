import yaml from 'js-yaml'

export interface FrontmatterResult {
  data: Record<string, unknown>
  content: string
}

/** Parse `---` YAML frontmatter (gray-matter-compatible subset). */
export function parseFrontmatter(raw: string): FrontmatterResult {
  const src = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
  if (!src.startsWith('---')) {
    return { data: {}, content: src }
  }
  const close = src.indexOf('\n---', 3)
  if (close === -1) {
    return { data: {}, content: src }
  }
  const fmBlock = src.slice(3, close).replace(/^\r?\n/, '')
  let content = src.slice(close + 4)
  if (content.startsWith('\r\n')) content = content.slice(2)
  else if (content.startsWith('\n')) content = content.slice(1)
  const data = (yaml.load(fmBlock) as Record<string, unknown> | undefined) ?? {}
  return { data, content }
}

/** Normalize date fields parsed as Date objects to YYYY-MM-DD strings. */
export function normalizeFrontmatterDates(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...data }
  if (out.date instanceof Date) {
    out.date = out.date.toISOString().split('T')[0]
  }
  return out
}
