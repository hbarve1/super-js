'use client'

import Link from 'next/link'
import { useState } from 'react'
import { GITHUB_URL } from '@/lib/site'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const LINKS = [
  { href: '/docs/intro', label: 'Docs' },
  { href: '/tour', label: 'Tour' },
  { href: '/playground', label: 'Playground' },
  { href: '/errors', label: 'Errors' },
  { href: '/blog', label: 'Blog' },
] as const

function formatStars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function GitHubLink({ stars, className = '' }: { stars?: number; className?: string }) {
  return (
    <a
      href={GITHUB_URL}
      aria-label="View Super.js on GitHub"
      className={`inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-primary ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0C17 4.7 18 5 18 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5A11.5 11.5 0 0023.5 12C23.5 5.7 18.3.5 12 .5z" />
      </svg>
      {stars != null && <span className="tabular-nums">★ {formatStars(stars)}</span>}
      <span className={stars != null ? 'sr-only' : ''}>GitHub</span>
    </a>
  )
}

export function Navbar({ stars }: { stars?: number }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-bg-deep/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-mono text-lg font-bold tracking-tight">
          super<span className="text-orange">.js</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-text-muted transition-colors hover:text-text-primary">
              {l.label}
            </Link>
          ))}
          <GitHubLink stars={stars} />
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
            className="rounded p-2 text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
          >
            <span className="block h-0.5 w-5 bg-current" />
            <span className="mt-1 block h-0.5 w-5 bg-current" />
            <span className="mt-1 block h-0.5 w-5 bg-current" />
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-border bg-bg-deep px-6 py-4 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-text-muted transition-colors hover:text-text-primary"
            >
              {l.label}
            </Link>
          ))}
          <GitHubLink stars={stars} className="py-2" />
        </div>
      )}
    </header>
  )
}
