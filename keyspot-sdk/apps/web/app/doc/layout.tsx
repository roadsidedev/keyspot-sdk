'use client'

import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import { DocSidebar } from './sidebar'
import { Menu, X, ChevronRight, GitBranch } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const sidebarGroups = [
  {
    label: 'Getting Started',
    separator: true,
    pages: [
      { href: '/doc', label: 'Overview' },
      { href: '/doc/installation', label: 'Installation' },
      { href: '/doc/quick-start', label: 'Quick Start' },
    ],
  },
  {
    label: 'Core',
    separator: true,
    pages: [
      { href: '/doc/concepts', label: 'Core Concepts' },
      { href: '/doc/api-reference', label: 'API Reference' },
      { href: '/doc/scanner', label: 'Scanner' },
      { href: '/doc/taint-engine', label: 'Taint Engine' },
      { href: '/doc/promptshield', label: 'PromptShield' },
      { href: '/doc/checkpoint-system', label: 'Checkpoint System' },
    ],
  },
  {
    label: 'Storage',
    separator: true,
    pages: [
      { href: '/doc/vault-adapters', label: 'Vault Adapters' },
      { href: '/doc/audit-compliance', label: 'Audit & Compliance' },
    ],
  },
  {
    label: 'Integrations',
    separator: true,
    pages: [
      { href: '/doc/integrations', label: 'Framework Integrations' },
      { href: '/doc/vector-store-adapters', label: 'Vector Store Adapters' },
      { href: '/doc/cli', label: 'CLI' },
    ],
  },
  {
    label: 'Deploy',
    separator: true,
    pages: [
      { href: '/doc/observability', label: 'Observability' },
      { href: '/doc/pricing-deployment', label: 'Pricing & Deployment' },
      { href: '/doc/security-architecture', label: 'Security Architecture' },
      { href: '/doc/threat-model', label: 'Threat Model' },
    ],
  },
  {
    label: 'Other',
    separator: true,
    pages: [
      { href: '/doc/python-sdk', label: 'Python SDK' },
    ],
  },
]

export default function DocLayout({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()

  // Close menu when path changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  // Find current page label for mobile breadcrumb
  const allPages = sidebarGroups.flatMap(g => g.pages)
  const currentPage = allPages.find(p => p.href === pathname) || allPages[0]

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 -ml-2 md:hidden text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link href="/" className="font-bold tracking-tight text-xl hover:opacity-80 transition-opacity flex items-center gap-2">
              <span className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 w-8 h-8 rounded-lg flex items-center justify-center text-sm">K</span>
              KeySpot
            </Link>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-8 text-sm font-medium">
            <Link href="/doc" className="text-zinc-950 dark:text-white">Docs</Link>
            <Link href="/pricing" className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors">Pricing</Link>
            <a 
              href="https://github.com/roadsidedev/keyspot-sdk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              <GitBranch size={20} />
            </a>
          </div>
        </div>
      </nav>

      {/* Mobile Breadcrumb/Navigation Trigger */}
      <div className="md:hidden border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50 px-4 py-2.5 flex items-center text-xs font-medium text-zinc-500">
        <Link href="/doc" className="hover:text-zinc-950 dark:hover:text-white">Docs</Link>
        <ChevronRight size={14} className="mx-1 opacity-50" />
        <span className="text-zinc-900 dark:text-white truncate">{currentPage.label}</span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        {/* Sidebar - Desktop */}
        <div className="hidden md:block">
          <DocSidebar groups={sidebarGroups} />
        </div>

        {/* Sidebar - Mobile Overlay */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-zinc-950 shadow-2xl border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto pt-16">
              <DocSidebar groups={sidebarGroups} onItemClick={() => setIsMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 md:px-12 py-10 md:py-16">
          <div className="max-w-3xl">
            <article className="prose prose-zinc dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h1:text-4xl prose-h1:mb-8
              prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:border-b prose-h2:border-zinc-100 dark:prose-h2:border-zinc-800 prose-h2:pb-2
              prose-p:text-zinc-600 dark:prose-p:text-zinc-400 prose-p:leading-relaxed
              prose-a:text-zinc-900 dark:prose-a:text-white prose-a:font-medium prose-a:underline-offset-4 hover:prose-a:text-blue-600 dark:hover:prose-a:text-blue-400
              prose-strong:text-zinc-900 dark:prose-strong:text-white
              prose-code:text-zinc-900 dark:prose-code:text-zinc-100 prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-zinc-950 dark:prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-xl prose-pre:shadow-lg
              prose-table:border-collapse prose-th:bg-zinc-50 dark:prose-th:bg-zinc-900 prose-th:text-zinc-900 dark:prose-th:text-white prose-th:px-4 prose-th:py-3 prose-td:px-4 prose-td:py-3 prose-td:border-t prose-td:border-zinc-100 dark:prose-td:border-zinc-800
              prose-blockquote:border-l-4 prose-blockquote:border-zinc-200 dark:prose-blockquote:border-zinc-700 prose-blockquote:italic prose-blockquote:text-zinc-500
            ">
              {children}
            </article>

            {/* Pagination / Navigation Elements */}
            <div className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between gap-4">
              {/* This could be improved further by calculating prev/next pages */}
              <Link href="/doc" className="group flex flex-col p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-white transition-all">
                <span className="text-xs text-zinc-500 mb-1">Previous</span>
                <span className="font-semibold group-hover:text-zinc-900 dark:group-hover:text-white transition-colors flex items-center gap-1">
                  Overview
                </span>
              </Link>
              <Link href="/doc/installation" className="group flex flex-col p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-white transition-all text-right">
                <span className="text-xs text-zinc-500 mb-1">Next</span>
                <span className="font-semibold group-hover:text-zinc-900 dark:group-hover:text-white transition-colors flex items-center justify-end gap-1">
                  Installation <ChevronRight size={16} />
                </span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
