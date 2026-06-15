import { getAllPosts } from '@/lib/blog'
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/site'

export const dynamic = 'force-static'

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** RSS 2.0 feed for the blog. */
export async function GET(): Promise<Response> {
  const posts = await getAllPosts()
  const updated = posts[0]?.frontmatter.date

  const items = posts
    .map((p) => {
      const url = `${SITE_URL}/blog/${p.slug}`
      const pubDate = new Date(p.frontmatter.date).toUTCString()
      return `    <item>
      <title>${escapeXml(p.frontmatter.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
${p.frontmatter.author ? `      <author>${escapeXml(p.frontmatter.author)}</author>\n` : ''}      <description>${escapeXml(p.frontmatter.description ?? '')}</description>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)} Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${updated ? `    <lastBuildDate>${new Date(updated).toUTCString()}</lastBuildDate>\n` : ''}${items}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
