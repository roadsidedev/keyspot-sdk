"use client";

import Link from "next/link";
import { Copy, ExternalLink, GitBranch, BookOpen, CreditCard } from "lucide-react";

export default function KeySpotLanding() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-semibold tracking-tight text-xl">KeySpot</div>
            <div className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-mono">SDK</div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/doc" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">Docs</Link>
            <Link href="/pricing" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">Pricing</Link>
            <a href="https://github.com/roadsidedev/keyspot-sdk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">
              GitHub <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-xs font-mono tracking-[2px] mb-6">
          RUNTIME SECURITY FOR AI AGENTS
        </div>

        <h1 className="text-6xl font-semibold tracking-tighter leading-none mb-4">
          Secrets never<br />persist in agent memory.
        </h1>

        <p className="max-w-md mx-auto text-lg text-zinc-600 dark:text-zinc-400 mt-6">
          Checkpoint → Scan → Taint → Vault → Replace. Enforced at every boundary.
        </p>

        {/* Install Command */}
        <div className="mt-10 max-w-lg mx-auto">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2 px-1">
            <span>Install</span>
            <span>Node 18+</span>
          </div>
          <div className="group relative flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-5 py-4 font-mono text-sm">
            <code className="flex-1 text-left">npm install @roadsidelab/keyspot-core</code>
            <button
              onClick={() => navigator.clipboard.writeText("npm install @roadsidelab/keyspot-core")}
              className="opacity-60 group-hover:opacity-100 transition p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/doc"
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 dark:bg-white px-6 text-sm font-medium text-white dark:text-zinc-950 transition hover:bg-zinc-800 dark:hover:bg-zinc-200"
          >
            <BookOpen className="mr-2 h-4 w-4" /> Read the docs
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 px-6 text-sm font-medium transition hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <CreditCard className="mr-2 h-4 w-4" /> View pricing
          </Link>
        </div>
      </div>

      {/* What it catches */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-xs uppercase tracking-[3px] text-zinc-500 dark:text-zinc-400 mb-4">COVERS</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 text-sm">
            {[
              "OpenAI / Anthropic keys",
              "AWS, GCP, Azure secrets",
              "Private keys & seed phrases",
              "Database connection strings",
              "GitHub / GitLab tokens",
              "Stripe / payment keys",
              "JWTs & bearer tokens",
              "PEM certificates",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
                <div className="h-px w-4 bg-zinc-300 dark:bg-zinc-700" /> {item}
              </div>
            ))}
          </div>
        </div>
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
