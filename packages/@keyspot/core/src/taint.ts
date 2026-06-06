import { createHash } from 'crypto';

export interface TaintMetadata {
  secretId: string;
  source: string;
  timestamp: number;
}

export class TaintEngine {
  private taintMap = new Map<string, TaintMetadata[]>();

  /**
   * Generates a stable hash for a value to track its taint status.
   */
  private hash(value: string | object): string {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    return createHash('sha256').update(str).digest('hex');
  }

  /**
   * Tags a value as tainted by one or more secrets.
   */
  tag(value: any, secretId: string, source: string = 'detection') {
    const h = this.hash(value);
    const existing = this.taintMap.get(h) || [];
    
    if (!existing.some(t => t.secretId === secretId)) {
      existing.push({
        secretId,
        source,
        timestamp: Date.now()
      });
      this.taintMap.set(h, existing);
    }
  }

  /**
   * Checks if a value is tainted and returns the associated secret IDs.
   */
  getTaints(value: any): TaintMetadata[] {
    return this.taintMap.get(this.hash(value)) || [];
  }

  /**
   * Propagates taint from source values to a derived value.
   * Useful for summaries, translations, or tool outputs.
   */
  propagate(sources: any[], derived: any) {
    const allTaints: TaintMetadata[] = [];
    for (const source of sources) {
      allTaints.push(...this.getTaints(source));
    }

    if (allTaints.length > 0) {
      const h = this.hash(derived);
      const uniqueTaints = Array.from(new Map(allTaints.map(t => [t.secretId, t])).values());
      this.taintMap.set(h, uniqueTaints);
    }
  }

  /**
   * Clears taint for a specific value (e.g., after successful rotation/removal).
   */
  untaint(value: any) {
    this.taintMap.delete(this.hash(value));
  }
}
