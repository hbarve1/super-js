import { notFound } from 'next/navigation'
import { getDocBySlug, getAllDocSlugs } from '@/lib/docs'
import DocContent from '@/components/docs/DocContent'
import TableOfContents from '@/components/docs/TableOfContents'

interface PageProps {
  params: Promise<{ slug: string[] }>
}

export async function generateStaticParams() {
  const slugs = await getAllDocSlugs()
  return slugs.map(slug => ({ slug }))
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  try {
    const doc = await getDocBySlug(slug)
    return {
      title: `${doc.frontmatter.title} — Super.js Docs`,
      description: doc.frontmatter.description ?? `Super.js documentation: ${doc.frontmatter.title}`,
    }
  } catch {
    return { title: 'Super.js Docs' }
  }
}

function extractHeadings(content: string) {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm
  const headings: { id: string; text: string; level: number }[] = []
  let match
  while ((match = headingRegex.exec(content)) !== null) {
    const text = match[2].trim()
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
    headings.push({ id, text, level: match[1].length })
  }
  return headings
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params
  let doc
  try {
    doc = await getDocBySlug(slug)
  } catch {
    notFound()
  }

  const headings = extractHeadings(doc.content)

  return (
    <>
      <DocContent source={doc.content} />
      <TableOfContents headings={headings} />
    </>
  )
}
