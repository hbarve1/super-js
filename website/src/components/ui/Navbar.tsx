'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from './Button'

const NAV_LINKS = [
  { label: 'Docs', href: '/docs' },
  { label: 'Playground', href: '/playground' },
  { label: 'Blog', href: '/blog' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-md bg-[#050510]/80">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 font-bold text-lg">
          <span className="text-white">Super</span>
          <span className="text-orange-500">.</span>
          <span className="text-white">js</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/hbarve1/super-js"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            GitHub
          </a>
          <Button href="/docs" size="sm">Get Started</Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-white/60 hover:text-white"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/5 bg-[#050510] px-4 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/70 hover:text-white"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/hbarve1/super-js"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/70 hover:text-white"
          >
            GitHub
          </a>
          <Button href="/docs" size="sm" className="w-fit">Get Started</Button>
        </div>
      )}
    </header>
  )
}
