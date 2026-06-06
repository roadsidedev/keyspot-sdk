export interface AhoCorasickMatch {
  keyword: string;
  index: number;
}

interface TrieNode {
  children: Map<string, TrieNode>;
  fail: TrieNode | null;
  output: string[];
}

export class AhoCorasick {
  private root: TrieNode;

  constructor(keywords: string[]) {
    this.root = this.buildTrie(keywords);
    this.buildFailureLinks();
  }

  private buildTrie(keywords: string[]): TrieNode {
    const root: TrieNode = { children: new Map(), fail: null, output: [] };

    for (const keyword of keywords) {
      let node = root;
      for (const char of keyword) {
        if (!node.children.has(char)) {
          node.children.set(char, { children: new Map(), fail: null, output: [] });
        }
        node = node.children.get(char)!;
      }
      node.output.push(keyword);
    }

    return root;
  }

  private buildFailureLinks(): void {
    const queue: TrieNode[] = [];

    for (const [, child] of this.root.children) {
      child.fail = this.root;
      queue.push(child);
    }

    while (queue.length > 0) {
      const node = queue.shift()!;

      for (const [char, child] of node.children) {
        let fail = node.fail;
        while (fail !== null && !fail.children.has(char)) {
          fail = fail.fail;
        }
        const failChild = fail !== null ? fail.children.get(char) : undefined;
        child.fail = failChild ?? this.root;
        child.output.push(...child.fail.output);
        queue.push(child);
      }
    }
  }

  search(text: string): AhoCorasickMatch[] {
    const results: AhoCorasickMatch[] = [];
    let node: TrieNode = this.root;

    for (let i = 0; i < text.length; i++) {
      const char = text[i]!;

      while (node !== this.root && !node.children.has(char)) {
        node = node.fail ?? this.root;
      }

      const nextNode = node.children.get(char);
      if (nextNode) {
        node = nextNode;
      }

      if (node.output.length > 0) {
        for (const keyword of node.output) {
          results.push({ keyword, index: i - keyword.length + 1 });
        }
      }
    }

    return results;
  }

  hasMatch(text: string): boolean {
    let node: TrieNode = this.root;

    for (let i = 0; i < text.length; i++) {
      const char = text[i]!;

      while (node !== this.root && !node.children.has(char)) {
        node = node.fail ?? this.root;
      }

      const nextNode = node.children.get(char);
      if (nextNode) {
        node = nextNode;
      }

      if (node.output.length > 0) {
        return true;
      }
    }

    return false;
  }
}
