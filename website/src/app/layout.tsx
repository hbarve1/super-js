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
  keywords: ['javascript', 'typescript', 'superset', 'type safety', 'sum types', 'match expressions'],
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
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-[#050510] text-[#f8fafc] font-sans antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  )
}
