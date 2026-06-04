#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AgentGuard } from '@agentguard/core';
import { builtInPatterns } from '@agentguard/patterns';

interface ScanOptions {
  path: string;
  git?: boolean;
  prune?: boolean;
  format?: 'text' | 'json';
}

async function scanFiles(options: ScanOptions): Promise<void> {
  const guard = new AgentGuard({ patterns: builtInPatterns });

  function walkDir(dir: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
          files.push(...walkDir(full));
        }
      } else {
        files.push(full);
      }
    }
    return files;
  }

  const files = walkDir(options.path);
  let totalMatches = 0;

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const matches = await guard.scan(content);
      if (matches.length > 0) {
        totalMatches += matches.length;
        if (options.format === 'json') {
          console.log(JSON.stringify({ file, matches }));
        } else {
          console.log(`\n${file}:`);
          for (const m of matches) {
            const action = options.prune ? '[PRUNED]' : '[FOUND]';
            console.log(`  ${action} ${m.type} (${m.severity}) at ${m.path || 'root'}`);
            console.log(`    ${m.redacted}`);
          }
          if (options.prune) {
            let pruned = content;
            for (const m of matches) {
              if (m.rawValue) {
                pruned = pruned.replaceAll(m.rawValue, m.redacted);
              }
            }
            writeFileSync(file, pruned, 'utf-8');
          }
        }
      }
    } catch {
      // Skip binary or unreadable files
    }
  }

  if (options.format !== 'json') {
    console.log(`\nScan complete. ${totalMatches} secret(s) found across ${files.length} file(s).`);
  }

  if (totalMatches > 0 && !options.prune) {
    process.exitCode = 1;
  }
}

function installHook(): void {
  const hookDir = join(process.cwd(), '.git', 'hooks');
  if (!existsSync(hookDir)) {
    console.error('Not a git repository: no .git/hooks directory found');
    process.exit(1);
  }

  const hookPath = join(hookDir, 'pre-commit');
  const hookContent = `#!/bin/sh
# AgentGuard pre-commit hook — scans staged files for secrets
exec npx @agentguard/cli scan --git
`;

  writeFileSync(hookPath, hookContent, 'utf-8');
  console.log(`Installed pre-commit hook at ${hookPath}`);
}

async function printHelp(): Promise<void> {
  console.log(`AgentGuard v2.0.0 — Runtime security for AI agents

USAGE
  agentguard scan <path>     Scan files for secrets
  agentguard install         Install pre-commit hook
  agentguard --version       Show version

OPTIONS
  --git        Scan only files changed in the last commit (for pre-commit)
  --prune      Auto-redact found secrets in-place
  --json       Output in JSON format
  --help       Show this help
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    await printHelp();
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('2.0.0');
    return;
  }

  if (args[0] === 'install') {
    installHook();
    return;
  }

  if (args[0] === 'scan' && args[1]) {
    await scanFiles({
      path: args[1],
      git: args.includes('--git'),
      prune: args.includes('--prune'),
      format: args.includes('--json') ? 'json' : 'text',
    });
    return;
  }

  if (args[0] === 'scan' && args.includes('--git')) {
    // Pre-commit mode: scan staged changed files
    const { execSync } = await import('child_process');
    const diffOutput = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    const files = diffOutput.split('\n').filter(Boolean).map(f => join(process.cwd(), f));

    let totalMatches = 0;
    const guard = new AgentGuard({ patterns: builtInPatterns });

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const matches = await guard.scan(content);
        if (matches.length > 0) {
          totalMatches += matches.length;
          console.log(`\n${file}:`);
          for (const m of matches) {
            console.log(`  [BLOCKED] ${m.type} (${m.severity})`);
            console.log(`    ${m.redacted}`);
          }
        }
      } catch { /* skip unreadable */ }
    }

    if (totalMatches > 0) {
      console.log(`\n${totalMatches} secret(s) found in staged changes. Commit blocked.`);
      process.exit(1);
    }
    return;
  }

  console.error('Unknown command. Use --help for usage.');
  process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
