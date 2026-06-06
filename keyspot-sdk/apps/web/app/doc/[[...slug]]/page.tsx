import Link from "next/link";
import { ExternalLink, GitBranch, BookOpen } from "lucide-react";

export default async function DocPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold tracking-tight text-xl">KeySpot</Link>
            <div className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-mono">SDK</div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/doc" className="text-zinc-950 dark:text-white font-medium">Docs</Link>
            <Link href="/pricing" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">Pricing</Link>
            <a href="https://github.com/roadsidedev/keyspot-sdk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">
              GitHub <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16 flex gap-16">
        {/* Sidebar */}
        <aside className="w-48 shrink-0">
          <div className="text-xs uppercase tracking-[3px] text-zinc-500 dark:text-zinc-400 mb-4">Getting Started</div>
          <ul className="space-y-2 text-sm">
            <li><a href="/doc/installation" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors">Installation</a></li>
            <li><a href="/doc/quick-start" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors">Quick Start</a></li>
          </ul>

          <div className="text-xs uppercase tracking-[3px] text-zinc-500 dark:text-zinc-400 mt-8 mb-4">Core</div>
          <ul className="space-y-2 text-sm">
            <li><a href="/doc/concepts" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors">Core Concepts</a></li>
            <li><a href="/doc/vault-adapters" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors">Vault Adapters</a></li>
          </ul>

          <div className="text-xs uppercase tracking-[3px] text-zinc-500 dark:text-zinc-400 mt-8 mb-4">Integrations</div>
          <ul className="space-y-2 text-sm">
            <li><a href="/doc/integrations" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors">Framework Integrations</a></li>
            <li><a href="/doc/cli" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors">CLI</a></li>
          </ul>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <h1 className="text-4xl font-semibold tracking-tight mb-6">Documentation</h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
            The full documentation is being migrated to MDX.
            You can find the complete reference in <code className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-sm font-mono">DOCUMENTATION.md</code> in the repository.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { href: "/doc/installation", title: "Installation", desc: "Install via npm, pnpm, or yarn" },
              { href: "/doc/quick-start", title: "Quick Start", desc: "Get running in 5 minutes" },
              { href: "/doc/concepts", title: "Core Concepts", desc: "Scanner, TaintEngine, Vault, Checkpoint" },
              { href: "/doc/vault-adapters", title: "Vault Adapters", desc: "In-memory, Redis, DynamoDB, file-based" },
              { href: "/doc/integrations", title: "Framework Integrations", desc: "LangChain, Anthropic, OpenAI, Vercel AI SDK" },
              { href: "/doc/cli", title: "CLI", desc: "Scan files, pre-commit hooks, CI integration" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="font-medium mb-1">{item.title}</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">{item.desc}</div>
              </a>
            ))}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-auto">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <div>MIT License • Open source</div>
          <a href="https://github.com/roadsidedev/keyspot-sdk" className="flex items-center gap-1.5 hover:text-zinc-700 dark:hover:text-zinc-300">
            <GitBranch className="h-3.5 w-3.5" /> roadsidedev/keyspot-sdk
          </a>
        </div>
      </footer>
    </div>
  );
}
