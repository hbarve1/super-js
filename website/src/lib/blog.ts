import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export interface PostFrontmatter {
  title: string
  date: string
  description?: string
  author?: string
}

export interface PostSummary {
  slug: string
  frontmatter: PostFrontmatter
}

export interface Post {
  slug: string
  frontmatter: PostFrontmatter
  content: string
}

export async function getAllPostSlugs(): Promise<string[]> {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.mdx'))
    .map(f => f.replace(/\.mdx$/, ''))
}

export async function getPostBySlug(slug: string): Promise<Post> {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  return { slug, frontmatter: data as PostFrontmatter, content }
}

export async function getAllPosts(): Promise<PostSummary[]> {
  const slugs = await getAllPostSlugs()
  const posts: PostSummary[] = []
  for (const slug of slugs) {
    const post = await getPostBySlug(slug)
    posts.push({ slug, frontmatter: post.frontmatter })
  }
  return posts.sort((a, b) =>
    new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime()
  )
}
