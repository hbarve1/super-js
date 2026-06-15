import { getDocNavTree } from '@/lib/docs'
import { getAllPosts } from '@/lib/blog'
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/site'

export const dynamic = 'force-static'

/**
 * llms.txt — an LLM-friendly index of the site (https://llmstxt.org).
 * A short summary plus curated, linked sections so a model can find the
 * authoritative pages without crawling HTML.
 */
export async function GET(): Promise<Response> {
  const docs = await getDocNavTree()
  const posts = await getAllPosts()

  const docLinks = docs
    .map((d) => {
      const desc = d.title
      return `- [${desc}](${SITE_URL}${d.href})`
    })
    .join('\n')

  const postLinks = posts
    .map((p) => `- [${p.frontmatter.title}](${SITE_URL}/blog/${p.slug})`)
    .join('\n')

  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

Super.js is a superset of JavaScript (not TypeScript) focused on type *safety*:
nullable types are spelled \`T?\` and a plain \`T\` can never be null; sum types
with exhaustive \`match\` make impossible states unrepresentable; \`any\` is
banned and the only escape hatch is the explicit \`dynamic\`. It compiles to
plain JavaScript with zero runtime overhead.

## Start here

- [Home](${SITE_URL}/)
- [Interactive tour](${SITE_URL}/tour): five runnable, in-browser lessons
- [Playground](${SITE_URL}/playground): compile and run Super.js in the browser
- [Error code reference](${SITE_URL}/errors): every SJS-P/E/W/L diagnostic

## Documentation

${docLinks}

## Machine-readable

- [llms-full.txt](${SITE_URL}/llms-full.txt): all documentation inlined as plain text
- [Blog RSS](${SITE_URL}/feed.xml)
- [Sitemap](${SITE_URL}/sitemap.xml)

## Blog

${postLinks}
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
