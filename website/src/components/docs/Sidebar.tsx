'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavItem } from '@/lib/docs'

interface SidebarProps {
  items: NavItem[]
}

export default function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname()

  return (
    <nav data-pagefind-ignore>
      <div className="text-xs font-semibold uppercase tracking-widest text-[#94a3b8] mb-4 px-3">
        Documentation
      </div>
      <ul className="space-y-1">
        {items.map(item => {
          const isActive = pathname === item.href
          return (
            <li key={item.slug}>
              <Link
                href={item.href}
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
