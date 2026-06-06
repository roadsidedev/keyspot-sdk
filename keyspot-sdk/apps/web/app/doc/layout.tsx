import type { ReactNode } from 'react'
import { DocSidebar } from './sidebar'

const pages = [
  { href: '/doc', label: 'Overview' },
  { href: '/doc/installation', label: 'Installation' },
  { href: '/doc/quick-start', label: 'Quick Start' },
  { href: '/doc/concepts', label: 'Core Concepts' },
  { href: '/doc/api-reference', label: 'API Reference' },
  { href: '/doc/vault-adapters', label: 'Vault Adapters' },
  { href: '/doc/integrations', label: 'Framework Integrations' },
  { href: '/doc/cli', label: 'CLI' },
]

export default function DocLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="font-semibold tracking-tight text-xl hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">
            KeySpot
          </a>
          <div className="flex items-center gap-6 text-sm">
            <a href="/doc" className="text-zinc-600 dark:text-zinc-400">Docs</a>
            <a href="/pricing" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">Pricing</a>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex">
        <DocSidebar pages={pages} />
        <main className="flex-1 max-w-3xl mx-auto px-8 py-12 prose prose-zinc dark:prose-invert prose-pre:bg-zinc-950 dark:prose-pre:bg-zinc-900 prose-code:text-sm">
          {children}
        </main>
      </div>
    </div>
  )
}
