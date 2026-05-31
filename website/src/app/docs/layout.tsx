import { getDocNavTree } from '@/lib/docs'
import Sidebar from '@/components/docs/Sidebar'
import SearchButton from '@/components/docs/SearchButton'

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const navItems = await getDocNavTree()
  return (
    <div className="min-h-screen bg-[#050510] pt-14">
      <div className="max-w-screen-2xl mx-auto flex">
        <aside className="w-64 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pr-4 border-r border-white/5">
          <SearchButton />
          <Sidebar items={navItems} />
        </aside>
        <main className="flex-1 flex px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
