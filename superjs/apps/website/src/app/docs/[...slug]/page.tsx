import { notFound } from 'next/navigation'
import { getDocBySlug, getAllDocSlugs, slugify, editUrl, type Doc } from '@/lib/docs'
import DocContent from '@/components/docs/DocContent'
import TableOfContents from '@/components/docs/TableOfContents'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL, SITE_NAME } from '@/lib/site'

interface PageProps {
  params: Promise<{ slug: string[] }>
}

export async function generateStaticParams() {
  const slugs = await getAllDocSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  try {
    const doc = await getDocBySlug(slug)
    const docPath = `/docs/${slug.join('/')}`
    const description =
      doc.frontmatter.description ?? `Super.js documentation: ${doc.frontmatter.title}`
    return {
      title: `${doc.frontmatter.title} — Super.js Docs`,
      description,
      alternates: { canonical: docPath },
      openGraph: { title: doc.frontmatter.title, description, type: 'article', url: docPath },
    }
  } catch {
    return { title: 'Super.js Docs' }
  }
}

/** Pull h2/h3 headings from the raw MDX for the table of contents. */
function extractHeadings(content: string) {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm
  const headings: { id: string; text: string; level: number }[] = []
  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(content)) !== null) {
    const text = match[2].trim()
    headings.push({ id: slugify(text), text, level: match[1].length })
  }
  return headings
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params
  let doc: Doc | null = null
  try {
    doc = await getDocBySlug(slug)
  } catch {
    // Missing doc — handled by notFound() below.
  }
  if (!doc) notFound()

  const headings = extractHeadings(doc.content)
  const docPath = `/docs/${slug.join('/')}`
  const ghEditUrl = editUrl(doc.filePath)

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: doc.frontmatter.title,
      description: doc.frontmatter.description ?? doc.frontmatter.title,
      url: `${SITE_URL}${docPath}`,
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: { '@type': 'Organization', name: SITE_NAME },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Docs', item: `${SITE_URL}/docs` },
        { '@type': 'ListItem', position: 2, name: doc.frontmatter.title, item: `${SITE_URL}${docPath}` },
      ],
    },
  ]

  return (
    <>
      <JsonLd data={structuredData} />
      <div className="w-full min-w-0 max-w-3xl">
        <DocContent source={doc.content} />
        <footer className="mt-12 pt-6 border-t border-border">
          <a
            href={ghEditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-text-subtle hover:text-text-muted transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Edit this page on GitHub
          </a>
        </footer>
      </div>
      <TableOfContents headings={headings} />
    </>
  )
}
