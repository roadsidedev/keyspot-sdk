import { createPublicClient, http, getAddress, type Hash } from 'viem';
import { base } from 'viem/chains';

// ── Types ──────────────────────────────────────────────────────

export interface X402PaymentRequest {
  amount: string;
  currency: string;
  payTo: string;
  network: string;
}

export interface X402Proof {
  txHash: string;
}

export interface X402AccessToken {
  token: string;
  sender: string;
  issuedAt: number;
  expiresAt: number;
}

// ── Configuration ───────────────────────────────────────────────

export interface X402FacilitatorConfig {
  network: 'base' | 'base-sepolia';
  payTo: string;
  pricing: Record<string, string>;
  rpcUrl?: string;
}

const CHAIN_IDS: Record<string, number> = {
  'base': 8453,
  'base-sepolia': 84532,
};

// ── Facilitator (Server-side) ──────────────────────────────────

export class X402Facilitator {
  private authorized = new Map<string, { credit: bigint; expiry: number }>();
  private client: ReturnType<typeof createPublicClient>;

  constructor(private config: X402FacilitatorConfig) {
    this.client = createPublicClient({
      chain: base,
      transport: http(config.rpcUrl),
    }) as any;
  }

  generatePaymentRequest(service: string): X402PaymentRequest {
    const amount = this.config.pricing[service];
    if (!amount) throw new Error(`No pricing configured for service: ${service}`);
    return {
      amount,
      currency: 'USDC',
      payTo: getAddress(this.config.payTo),
      network: this.config.network,
    };
  }

  async verifyPayment(proof: X402Proof, request: X402PaymentRequest): Promise<X402AccessToken | null> {
    try {
      const txHash = proof.txHash as Hash;
      const tx = await this.client.getTransaction({ hash: txHash });
      if (!tx) return null;

      // Verify recipient matches payTo
      const payTo = getAddress(this.config.payTo);
      if (!tx.to || getAddress(tx.to) !== payTo) return null;

      // Verify tx is recent (within last 10 minutes)
      const block = await this.client.getBlock({ blockNumber: tx.blockNumber! });
      const now = BigInt(Math.floor(Date.now() / 1000));
      if (block.timestamp < now - 600n) return null;

      // Grant access to the sender
      const sender = getAddress(tx.from!);
      const amountNum = parseFloat(request.amount);
      this.authorized.set(sender, {
        credit: BigInt(Math.floor(amountNum * 1_000_000)),
        expiry: Date.now() + 24 * 60 * 60 * 1000,
      });

      const token: X402AccessToken = {
        token: Buffer.from(JSON.stringify({ sub: sender, iat: Date.now(), exp: Date.now() + 86400000 })).toString('base64url'),
        sender,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      };

      return token;
    } catch {
      return null;
    }
  }

  hasAccess(agentAddress: string): boolean {
    const addr = getAddress(agentAddress);
    const auth = this.authorized.get(addr);
    if (!auth) return false;
    if (auth.expiry < Date.now()) {
      this.authorized.delete(addr);
      return false;
    }
    return auth.credit > 0n;
  }

  consumeCredit(agentAddress: string, amount: bigint): boolean {
    const auth = this.authorized.get(getAddress(agentAddress));
    if (!auth || auth.credit < amount) return false;
    auth.credit -= amount;
    return true;
  }
}
