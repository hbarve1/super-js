import { notFound } from 'next/navigation'
import { getDocBySlug, getAllDocSlugs, slugify, type Doc } from '@/lib/docs'
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
    const path = `/docs/${slug.join('/')}`
    const description =
      doc.frontmatter.description ?? `Super.js documentation: ${doc.frontmatter.title}`
    return {
      title: `${doc.frontmatter.title} — Super.js Docs`,
      description,
      alternates: { canonical: path },
      openGraph: { title: doc.frontmatter.title, description, type: 'article', url: path },
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
    // Missing doc — handled by notFound() outside the try/catch below.
  }
  if (!doc) notFound()

  const headings = extractHeadings(doc.content)
  const path = `/docs/${slug.join('/')}`
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: doc.frontmatter.title,
      description: doc.frontmatter.description ?? doc.frontmatter.title,
      url: `${SITE_URL}${path}`,
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: { '@type': 'Organization', name: SITE_NAME },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Docs', item: `${SITE_URL}/docs` },
        { '@type': 'ListItem', position: 2, name: doc.frontmatter.title, item: `${SITE_URL}${path}` },
      ],
    },
  ]

  return (
    <>
      <JsonLd data={structuredData} />
      <DocContent source={doc.content} />
      <TableOfContents headings={headings} />
    </>
  )
}
