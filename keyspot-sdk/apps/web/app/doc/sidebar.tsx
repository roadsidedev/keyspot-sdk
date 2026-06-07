'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'

interface SidebarGroup {
  label: string
  separator?: boolean
  pages: { href: string; label: string }[]
}

export function DocSidebar({ groups }: { groups: SidebarGroup[] }) {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 hidden md:block overflow-y-auto">
      <nav className="sticky top-0 p-4 space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            {group.separator && (
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[2px] text-zinc-400 dark:text-zinc-500">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.pages.map((page) => {
                const isActive = pathname === page.href
                return (
                  <Link
                    key={page.href}
                    href={page.href}
                    className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-950 dark:text-white'
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
