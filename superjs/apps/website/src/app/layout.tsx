import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
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
  alternates: {
    types: {
      'application/rss+xml': [{ url: '/feed.xml', title: 'Super.js Blog' }],
    },
  },
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

export const viewport: Viewport = {
  themeColor: '#0d1117',
}

export default async function RootLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  const stars = await getStars()
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved (or system) theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t||(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');if(d==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-bg-deep text-text-primary font-sans antialiased" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-orange focus:text-text-primary focus:rounded-lg focus:font-semibold focus:shadow-lg"
        >
          Skip to content
        </a>
        <Navbar stars={stars} />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
