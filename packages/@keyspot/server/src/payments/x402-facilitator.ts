import { createPublicClient, http, getAddress, type Hash, parseAbi } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { SignJWT } from 'jose';
import crypto from 'node:crypto';

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

// USDC transfer event signature
const USDC_TRANSFER_ABI = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

const USDC_ADDRESSES: Record<string, `0x${string}`> = {
  'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',    // Base mainnet USDC
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
};

const JWT_SECRET_RAW = process.env.X402_JWT_SECRET || process.env.JWT_SECRET;
if (!JWT_SECRET_RAW) throw new Error('X402_JWT_SECRET or JWT_SECRET environment variable is required');
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);

// ── Facilitator (Server-side) ──────────────────────────────────

export class X402Facilitator {
  private authorized = new Map<string, { credit: bigint; expiry: number }>();
  private client: ReturnType<typeof createPublicClient>;

  constructor(private config: X402FacilitatorConfig) {
    const chain = config.network === 'base-sepolia' ? baseSepolia : base;
    this.client = createPublicClient({
      chain,
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
      if (!tx) {
        console.warn(`[x402] Transaction not found: ${txHash}`);
        return null;
      }

      // Verify recipient matches payTo
      const payTo = getAddress(this.config.payTo);
      if (!tx.to || getAddress(tx.to) !== payTo) {
        console.warn(`[x402] Recipient mismatch: expected ${payTo}, got ${tx.to}`);
        return null;
      }

      // Verify tx is recent (within last 10 minutes)
      const block = await this.client.getBlock({ blockNumber: tx.blockNumber! });
      const now = BigInt(Math.floor(Date.now() / 1000));
      if (block.timestamp < now - 600n) {
        console.warn(`[x402] Transaction too old: ${block.timestamp} < ${now - 600n}`);
        return null;
      }

      // Verify the transfer was for the correct USDC amount
      // USDC uses 6 decimal places
      const requestedAmount = BigInt(Math.floor(parseFloat(request.amount) * 1_000_000));
      const usdcAddress = USDC_ADDRESSES[this.config.network];

      // Check the transaction logs for a USDC Transfer event matching our criteria
      const receipt = await this.client.getTransactionReceipt({ hash: txHash });
      if (!receipt) {
        console.warn(`[x402] Transaction receipt not found: ${txHash}`);
        return null;
      }

      if (!usdcAddress) {
        console.warn(`[x402] No USDC address configured for network: ${this.config.network}`);
        return null;
      }

      let transferFound = false;
      let transferredAmount = 0n;

      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === usdcAddress.toLowerCase()) {
          try {
            const decoded = usdcInterface.parseLog({
              topics: log.topics,
              data: log.data
            });
            if (decoded.args.to.toLowerCase() === payTo.toLowerCase() && decoded.args.from.toLowerCase() === tx.from?.toLowerCase()) {
              transferFound = true;
              transferredAmount = decoded.args.value;
              break;
            }
          } catch { /* not a transfer log, skip */ }
        }
      }

      if (!transferFound) {
        console.warn(`[x402] No USDC transfer found to ${payTo}`);
        return null;
      }

      if (transferredAmount < requestedAmount) {
        console.warn(`[x402] Insufficient payment: got ${transferredAmount}, expected ${requestedAmount}`);
        return null;
      }

      // Grant access to the sender
      const sender = getAddress(tx.from!);
      this.authorized.set(sender, {
        credit: transferredAmount,
        expiry: Date.now() + 24 * 60 * 60 * 1000,
      });

      // Sign the access token using JWT
      const token = await new SignJWT({
        sub: sender,
        credit: transferredAmount.toString(),
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(JWT_SECRET);

      const accessToken: X402AccessToken = {
        token,
        sender,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      };

      return accessToken;
    } catch (err) {
      console.error('[x402] Payment verification error:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  hasAccess(agentAddress: string): boolean {
    try {
      const addr = getAddress(agentAddress);
      const auth = this.authorized.get(addr);
      if (!auth) return false;
      if (auth.expiry < Date.now()) {
        this.authorized.delete(addr);
        return false;
      }
      return auth.credit > 0n;
    } catch {
      return false;
    }
  }

  calculateCost(service: string): bigint {
    const amount = this.config.pricing[service];
    if (!amount) return 0n;
    return BigInt(Math.floor(parseFloat(amount) * 1_000_000));
  }

  consumeCredit(agentAddress: string, amount: bigint): boolean {
    try {
      const auth = this.authorized.get(getAddress(agentAddress));
      if (!auth || auth.credit < amount) return false;
      auth.credit -= amount;
      return true;
    } catch {
      return false;
    }
  }
}

// USDC transfer event interface parsing
let usdcInterface: { parseLog: (args: { topics: readonly string[]; data: `0x${string}` }) => { args: { from: string; to: string; value: bigint } } };

try {
  // Try wAGNI-style ABI first
  usdcInterface = {
    parseLog: ({ topics, data }: { topics: readonly string[]; data: `0x${string}` }) => {
      const from = `0x${topics[1]!.slice(26)}` as `0x${string}`;
      const to = `0x${topics[2]!.slice(26)}` as `0x${string}`;
      // Decode value from data (uint256)
      const value = BigInt(data);
      return { args: { from: getAddress(from), to: getAddress(to), value } };
    }
  };
} catch {
  // Fallback: use viem's decodeEventLog
  const { decodeEventLog } = require('viem');
  usdcInterface = {
    parseLog: ({ topics, data }: { topics: readonly string[]; data: `0x${string}` }) => {
      const decoded = decodeEventLog({
        abi: USDC_TRANSFER_ABI,
        data,
        topics: topics as [signature: `0x${string}`, ...args: `0x${string}`[]],
      });
      return { args: decoded.args as { from: string; to: string; value: bigint } };
    }
  };
}
