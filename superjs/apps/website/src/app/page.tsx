import type { Metadata } from 'next'
import { Hero } from '@/components/hero'
import { Features } from '@/components/sections/Features'
import { Compare } from '@/components/sections/Compare'
import { PlaygroundEmbed } from '@/components/sections/PlaygroundEmbed'
import { Quickstart } from '@/components/sections/Quickstart'
import { Ecosystem } from '@/components/sections/Ecosystem'
import { CallToAction } from '@/components/sections/CallToAction'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, GITHUB_URL } from '@/lib/site'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cross-platform',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    softwareVersion: '1.0',
    programmingLanguage: 'JavaScript',
    license: 'https://opensource.org/license/mit',
    codeRepository: GITHUB_URL,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  },
]

export default function Home() {
  return (
    <main id="main-content">
      <JsonLd data={structuredData} />
      <Hero />
      <Features />
      <Compare />
      <PlaygroundEmbed />
      <Quickstart />
      <Ecosystem />
      <CallToAction />
    </main>
  )
}
