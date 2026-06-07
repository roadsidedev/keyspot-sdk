'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarGroup {
  label: string
  separator?: boolean
  pages: { href: string; label: string }[]
}

export function DocSidebar({ groups, onItemClick }: { groups: SidebarGroup[] ; onItemClick?: () => void }) {
  const pathname = usePathname()

  return (
    <aside className="w-full md:w-64 shrink-0 md:border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto md:h-[calc(100vh-4rem)] md:sticky md:top-16">
      <nav className="p-4 md:p-5">
        {groups.map((group, idx) => (
          <div key={group.label}>
            {group.separator && (
              <div className={`px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500 ${idx > 0 ? 'mt-10' : ''}`}>
                {group.label}
              </div>
            )}
            <div className={group.separator ? 'space-y-[6px]' : ''}>
              {group.pages.map((page) => {
                const isActive = pathname === page.href
                return (
                  <Link
                    key={page.href}
                    href={page.href}
                    onClick={onItemClick}
                    className={`block px-4 py-3 md:py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-950 dark:text-white shadow-sm ring-1 ring-zinc-200/50 dark:ring-zinc-700/50'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {page.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
