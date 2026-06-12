import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Navbar } from '@/components/ui/Navbar'
import './globals.css'

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
  metadataBase: new URL('https://superjs.dev'),
  openGraph: {
    title: 'Super.js — JavaScript, Perfected',
    description: 'Null-safe. Sum types. Match expressions. Zero runtime overhead.',
    url: 'https://superjs.dev',
    siteName: 'Super.js',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Super.js — JavaScript, Perfected',
  },
}

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="bg-bg-deep text-text-primary font-sans antialiased" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-orange focus:text-white focus:rounded-lg focus:font-semibold focus:shadow-lg"
        >
          Skip to content
        </a>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
