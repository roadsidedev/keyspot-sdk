import type { ReactNode } from 'react'
import { DocSidebar } from './sidebar'

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
        <DocSidebar groups={sidebarGroups} />
        <main className="flex-1 max-w-3xl mx-auto px-8 py-12 prose prose-zinc dark:prose-invert prose-pre:bg-zinc-950 dark:prose-pre:bg-zinc-900 prose-code:text-sm prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-table:border-collapse prose-th:border prose-th:border-zinc-200 dark:prose-th:border-zinc-700 prose-th:bg-zinc-50 dark:prose-th:bg-zinc-800 prose-td:border prose-td:border-zinc-200 dark:prose-td:border-zinc-700 prose-td:px-3 prose-td:py-2 prose-h2:mt-12 prose-h3:mt-8 prose-hr:border-zinc-200 dark:prose-hr:border-zinc-800">
          {children}
        </main>
      </div>
    </div>
  )
}
