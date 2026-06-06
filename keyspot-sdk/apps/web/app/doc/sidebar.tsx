'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function DocSidebar({ pages }: { pages: { href: string; label: string }[] }) {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 hidden md:block">
      <nav className="sticky top-0 p-6 space-y-1">
        {pages.map((page) => {
          const isActive = pathname === page.href
          return (
            <Link
              key={page.href}
              href={page.href}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-950 dark:text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              {page.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
