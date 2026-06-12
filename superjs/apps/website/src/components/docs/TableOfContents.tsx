'use client'

import { useEffect, useState } from 'react'

interface TocItem {
  id: string
  text: string
  level: number
}

export default function TableOfContents({ headings }: { headings: TocItem[] }) {
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)
        if (visible) setActiveId(visible.target.id)
      },
      { rootMargin: '0px 0px -70% 0px' },
    )
    headings.forEach((h) => {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <aside className="hidden xl:block w-56 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 pl-4" data-pagefind-ignore>
      <div className="text-xs font-semibold uppercase tracking-widest text-[#94a3b8] mb-4">
        On this page
      </div>
      <ul className="space-y-1">
        {headings.map((h) => (
          <li key={h.id} style={{ paddingLeft: `${(h.level - 2) * 12}px` }}>
            <a
              href={`#${h.id}`}
              className={[
                'block text-sm py-0.5 transition-colors',
                activeId === h.id ? 'text-[#f97316]' : 'text-[#94a3b8] hover:text-[#f8fafc]',
              ].join(' ')}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )
}
