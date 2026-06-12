import type { MetadataRoute } from 'next'
import { getAllDocSlugs } from '@/lib/docs'
import { getAllPostSlugs } from '@/lib/blog'

const BASE = 'https://superjs.org'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docSlugs = await getAllDocSlugs()
  const postSlugs = await getAllPostSlugs()

  const docEntries: MetadataRoute.Sitemap = docSlugs.map((segments) => ({
    url: `${BASE}/docs/${segments.join('/')}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const blogEntries: MetadataRoute.Sitemap = postSlugs.map((slug) => ({
    url: `${BASE}/blog/${slug}`,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [
    { url: BASE, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE}/playground`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/blog`, changeFrequency: 'weekly', priority: 0.6 },
    ...docEntries,
    ...blogEntries,
  ]
}
