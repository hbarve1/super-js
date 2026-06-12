'use client'

import Link from 'next/link'
import { useState } from 'react'

const LINKS = [
  { href: '/docs/intro', label: 'Docs' },
  { href: '/playground', label: 'Playground' },
  { href: '/blog', label: 'Blog' },
] as const

const GITHUB_URL = 'https://github.com/hbarve1/super-js'

export function Navbar() {
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
          <a
            href={GITHUB_URL}
            aria-label="View Super.js on GitHub"
            className="text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            GitHub
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={open}
          className="md:hidden rounded p-2 text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
        >
          <span className="block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
        </button>
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
          <a
            href={GITHUB_URL}
            aria-label="View Super.js on GitHub"
            className="block py-2 text-text-muted transition-colors hover:text-text-primary"
          >
            GitHub
          </a>
        </div>
      )}
    </header>
  )
}
