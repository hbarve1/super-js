import { notFound } from 'next/navigation'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import DocContent from '@/components/docs/DocContent'
import TableOfContents from '@/components/docs/TableOfContents'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL, SITE_NAME } from '@/lib/site'
import { slugify, editUrl } from '@/lib/docs'

interface PageProps {
  params: Promise<{ code: string }>
}

/**
 * Resolve the synced error-code page from docs/error-codes/<CODE>.md
 * (repo root, three levels above apps/website/).
 */
function getErrorCodeFilePath(code: string): string {
  return path.join(process.cwd(), '..', '..', '..', 'docs', 'error-codes', `${code}.md`)
}

/** Validate that the code matches the SJS-XNNN pattern. */
function isValidCode(code: string): boolean {
  return /^SJS-[EPLW]\d{3}$/.test(code)
}

export async function generateStaticParams() {
  const dir = path.join(process.cwd(), '..', '..', '..', 'docs', 'error-codes')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => /^SJS-[EPLW]\d{3}\.md$/.test(f))
    .map((f) => ({ code: f.replace('.md', '') }))
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params
  if (!isValidCode(code)) return { title: 'Error Code — Super.js Docs' }
  const filePath = getErrorCodeFilePath(code)
  if (!fs.existsSync(filePath)) return { title: `${code} — Super.js Docs` }
  const { data } = matter(fs.readFileSync(filePath, 'utf-8'))
  const title = (data.title as string | undefined) ?? code
  const description = (data.description as string | undefined) ?? `${code} diagnostic reference`
  const docPath = `/docs/errors/${code}`
  return {
    title: `${title} — Super.js Docs`,
    description,
    alternates: { canonical: docPath },
    openGraph: { title, description, type: 'article', url: docPath },
  }
}

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

export default async function ErrorCodePage({ params }: PageProps) {
  const { code } = await params

  if (!isValidCode(code)) notFound()

  const filePath = getErrorCodeFilePath(code)
  if (!fs.existsSync(filePath)) notFound()

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  const title = (data.title as string | undefined) ?? code
  const description = (data.description as string | undefined) ?? `${code} diagnostic reference`
  const docPath = `/docs/errors/${code}`
  const ghEditUrl = editUrl(filePath)
  const headings = extractHeadings(content)

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: title,
      description,
      url: `${SITE_URL}${docPath}`,
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: { '@type': 'Organization', name: SITE_NAME },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Docs', item: `${SITE_URL}/docs` },
        { '@type': 'ListItem', position: 2, name: 'Error Codes', item: `${SITE_URL}/errors` },
        { '@type': 'ListItem', position: 3, name: code, item: `${SITE_URL}${docPath}` },
      ],
    },
  ]

  return (
    <>
      <JsonLd data={structuredData} />
      <div className="w-full min-w-0 max-w-3xl">
        {/* Breadcrumb */}
        <nav className="text-sm text-text-subtle mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><a href="/docs" className="hover:text-text-muted transition-colors">Docs</a></li>
            <li aria-hidden="true">/</li>
            <li><a href="/errors" className="hover:text-text-muted transition-colors">Error Codes</a></li>
            <li aria-hidden="true">/</li>
            <li className="text-text-secondary font-mono">{code}</li>
          </ol>
        </nav>

        <DocContent source={content} />

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
