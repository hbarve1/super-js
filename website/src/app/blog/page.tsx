import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'

export const metadata = {
  title: 'Blog — Super.js',
  description: 'News and updates from the Super.js team',
}

export default async function BlogPage() {
  const posts = await getAllPosts()

  return (
    <main className="min-h-screen bg-[#050510] pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-4xl font-bold text-[#f8fafc] mb-2">Blog</h1>
        <p className="text-[#94a3b8] mb-12">News and updates from the Super.js team</p>
        <div className="space-y-8">
          {posts.map(post => (
            <article key={post.slug} className="border border-white/10 rounded-xl p-6 hover:border-[#f97316]/40 transition-colors">
              <time className="text-xs text-[#94a3b8] font-mono">{post.frontmatter.date}</time>
              <h2 className="text-xl font-semibold text-[#f8fafc] mt-2 mb-2">
                <Link href={`/blog/${post.slug}`} className="hover:text-[#f97316] transition-colors">
                  {post.frontmatter.title}
                </Link>
              </h2>
              {post.frontmatter.description && (
                <p className="text-[#94a3b8] text-sm leading-relaxed">{post.frontmatter.description}</p>
              )}
              <Link
                href={`/blog/${post.slug}`}
                className="inline-block mt-4 text-sm text-[#f97316] hover:text-[#fbbf24] transition-colors"
              >
                Read more →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
