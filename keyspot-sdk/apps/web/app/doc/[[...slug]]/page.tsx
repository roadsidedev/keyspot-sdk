import { notFound } from 'next/navigation';
import { getPageMap } from 'nextra/page-map';
import { NextraTheme } from 'nextra-theme-docs';

export default async function DocPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  const pageMap = await getPageMap('/doc');

  // This is a simplified docs renderer.
  // For full Nextra experience, we use the theme layout.
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 prose dark:prose-invert">
      <h1>Documentation</h1>
      <p>
        The full documentation is being migrated to MDX. 
        You can find the complete reference in <code>DOCUMENTATION.md</code> in the repository.
      </p>

      <ul>
        <li><a href="/doc/installation">Installation</a></li>
        <li><a href="/doc/quick-start">Quick Start</a></li>
        <li><a href="/doc/concepts">Core Concepts</a></li>
        <li><a href="/doc/vault-adapters">Vault Adapters</a></li>
        <li><a href="/doc/integrations">Framework Integrations</a></li>
        <li><a href="/doc/cli">CLI</a></li>
      </ul>
    </div>
  );
}
