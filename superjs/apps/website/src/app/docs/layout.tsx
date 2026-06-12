import type { ReactNode } from 'react'
import { getDocNavTree } from '@/lib/docs'
import MobileDocsNav, { DocsNavList } from '@/components/docs/Sidebar'
import SearchButton from '@/components/docs/SearchButton'

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const navItems = await getDocNavTree()
  return (
    <div className="min-h-screen bg-bg-deep pt-16">
      <div className="max-w-screen-2xl mx-auto flex">
        <aside className="hidden md:block w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 pr-4 border-r border-white/5">
          <SearchButton />
          <DocsNavList items={navItems} />
        </aside>
        <main id="main-content" className="flex-1 min-w-0 flex px-6 md:px-8 py-8">
          {children}
        </main>
      </div>
      <MobileDocsNav items={navItems} />
    </div>
  )
}
