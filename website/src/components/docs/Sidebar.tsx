'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { NavItem } from '@/lib/docs'

interface SidebarProps {
  items: NavItem[]
}

function SidebarNav({ items, onLinkClick }: { items: NavItem[]; onLinkClick?: () => void }) {
  const pathname = usePathname()
  return (
    <nav data-pagefind-ignore>
      <div className="text-xs font-semibold uppercase tracking-widest text-[#94a3b8] mb-4 px-3">
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
                    ? 'bg-[#f97316]/15 text-[#f97316] font-medium'
                    : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-white/5',
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

export default function Sidebar({ items }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-56 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 pr-4">
        <SidebarNav items={items} />
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open documentation menu"
        className="md:hidden fixed bottom-6 left-4 z-40 flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-full shadow-lg shadow-orange-500/30"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Docs
      </button>

      {/* Mobile drawer — always mounted, CSS transition */}
      <div className="md:hidden">
        {/* Backdrop */}
        <div
          className={[
            'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
            mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          ].join(' ')}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
        {/* Panel */}
        <div
          className={[
            'fixed top-0 left-0 z-50 h-full w-72 bg-[#0d1117] border-r border-white/10 overflow-y-auto py-8 px-4 transition-transform duration-300 ease-in-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <div className="flex items-center justify-between mb-6">
            <span className="font-semibold text-[#f8fafc]">Documentation</span>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close documentation menu"
              className="p-1 text-[#94a3b8] hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <SidebarNav items={items} onLinkClick={() => setMobileOpen(false)} />
        </div>
      </div>
    </>
  )
}
