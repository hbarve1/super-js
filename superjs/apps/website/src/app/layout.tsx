import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Navbar } from '@/components/ui/Navbar'
import { GITHUB_REPO } from '@/lib/site'
import './globals.css'

/** Live GitHub star count, revalidated hourly. Returns undefined on failure. */
async function getStars(): Promise<number | undefined> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return undefined
    const data = (await res.json()) as { stargazers_count?: number }
    return typeof data.stargazers_count === 'number' ? data.stargazers_count : undefined
  } catch {
    return undefined
  }
}

export const metadata: Metadata = {
  title: {
    default: 'Super.js — JavaScript, Perfected',
    template: '%s | Super.js',
  },
  description:
    'A null-safe, sum-typed superset of JavaScript. Compile to plain JS with zero runtime overhead.',
  keywords: [
    'javascript',
    'typescript',
    'superset',
    'type safety',
    'sum types',
    'match expressions',
  ],
  metadataBase: new URL('https://superjs.org'),
  openGraph: {
    title: 'Super.js — JavaScript, Perfected',
    description: 'Null-safe. Sum types. Match expressions. Zero runtime overhead.',
    url: 'https://superjs.org',
    siteName: 'Super.js',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Super.js — JavaScript, Perfected',
  },
}

export default async function RootLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  const stars = await getStars()
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="bg-bg-deep text-text-primary font-sans antialiased" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-orange focus:text-white focus:rounded-lg focus:font-semibold focus:shadow-lg"
        >
          Skip to content
        </a>
        <Navbar stars={stars} />
        {children}
      </body>
    </html>
  )
}
