import { notFound } from 'next/navigation'
import { getAllPostSlugs, getPostBySlug } from '@/lib/blog'
import DocContent from '@/components/docs/DocContent'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs()
  return slugs.map(slug => ({ slug }))
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  try {
    const post = await getPostBySlug(slug)
    return {
      title: `${post.frontmatter.title} — Super.js Blog`,
      description: post.frontmatter.description,
    }
  } catch {
    return { title: 'Super.js Blog' }
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  let post
  try {
    post = await getPostBySlug(slug)
  } catch {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[#050510] pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <time className="text-xs text-[#94a3b8] font-mono">{post.frontmatter.date}</time>
        <h1 className="text-4xl font-bold text-[#f8fafc] mt-2 mb-8">{post.frontmatter.title}</h1>
        <DocContent source={post.content} />
      </div>
    </main>
  )
}
