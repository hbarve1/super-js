'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { NavItem } from '@/lib/docs'

/** The nav link list — reused by the desktop sidebar and the mobile drawer. */
export function DocsNavList({ items, onLinkClick }: { items: NavItem[]; onLinkClick?: () => void }) {
  const pathname = usePathname()
  return (
    <nav data-pagefind-ignore>
      <div className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4 px-3">
        Documentation
      </div>
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <li key={item.slug}>
              <Link
                href={item.href}
                onClick={onLinkClick}
                className={[
                  'block px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-orange/15 text-orange font-medium'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/5',
                ].join(' ')}
              >
                {item.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Mobile-only floating "Docs" button + slide-in drawer (SPEC §E-6). */
export default function MobileDocsNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open documentation menu"
        className="fixed bottom-6 left-4 z-40 flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-full shadow-lg shadow-orange-500/30"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Docs
      </button>

      <div
        className={[
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        className={[
          'fixed top-0 left-0 z-50 h-full w-72 bg-bg-dark border-r border-white/10 overflow-y-auto py-8 px-4 transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between mb-6">
          <span className="font-semibold text-text-primary">Documentation</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close documentation menu"
            className="p-1 text-text-muted hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <DocsNavList items={items} onLinkClick={() => setOpen(false)} />
      </div>
    </div>
  )
}
