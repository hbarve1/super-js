import { getDocNavTree, getDocBySlug } from '@/lib/docs'
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/site'

export const dynamic = 'force-static'

/**
 * llms-full.txt — the full documentation inlined as one plain-text document
 * (https://llmstxt.org), so a model can ingest everything in a single fetch.
 */
export async function GET(): Promise<Response> {
  const docs = await getDocNavTree()

  const sections: string[] = []
  for (const nav of docs) {
    const doc = await getDocBySlug(nav.slug.split('/'))
    sections.push(
      `# ${doc.frontmatter.title ?? nav.title}\n\nSource: ${SITE_URL}${nav.href}\n\n${doc.content.trim()}`,
    )
  }

  const body = `# ${SITE_NAME} — Full Documentation

> ${SITE_DESCRIPTION}

This file inlines every documentation page in reading order.

${'='.repeat(72)}

${sections.join(`\n\n${'='.repeat(72)}\n\n`)}
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
