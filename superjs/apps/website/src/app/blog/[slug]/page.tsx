import { notFound } from 'next/navigation'
import { getAllPostSlugs, getPostBySlug, type Post } from '@/lib/blog'
import DocContent from '@/components/docs/DocContent'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL, SITE_NAME } from '@/lib/site'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  try {
    const post = await getPostBySlug(slug)
    return {
      title: `${post.frontmatter.title} — Super.js Blog`,
      description: post.frontmatter.description,
      alternates: { canonical: `/blog/${slug}` },
      openGraph: {
        title: post.frontmatter.title,
        description: post.frontmatter.description,
        type: 'article',
        url: `/blog/${slug}`,
        publishedTime: post.frontmatter.date,
      },
    }
  } catch {
    return { title: 'Super.js Blog' }
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  let post: Post | null = null
  try {
    post = await getPostBySlug(slug)
  } catch {
    // Missing post — handled by notFound() outside the try/catch below.
  }
  if (!post) notFound()

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.frontmatter.title,
    description: post.frontmatter.description,
    datePublished: post.frontmatter.date,
    url: `${SITE_URL}/blog/${slug}`,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
  }

  return (
    <main id="main-content" className="min-h-screen bg-bg-deep pt-24 pb-16">
      <JsonLd data={structuredData} />
      <div className="max-w-3xl mx-auto px-6">
        <time className="text-xs text-text-muted font-mono">{post.frontmatter.date}</time>
        <h1 className="text-4xl font-bold text-text-primary mt-2 mb-8">{post.frontmatter.title}</h1>
        <DocContent source={post.content} />
      </div>
    </main>
  )
}
