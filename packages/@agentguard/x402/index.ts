import { createHash, randomBytes } from 'crypto';

export interface X402PaymentRequest {
  amount: string; // e.g., "0.0001"
  currency: string; // e.g., "USDC"
  payTo: string; // Wallet address
  network: string; // e.g., "base"
  authToken: string;
}

export interface X402Proof {
  txHash: string;
  sender: string;
  signature: string;
}

/**
 * x402 Facilitator handles the "Payment Required" flow.
 * It verifies on-chain payments and issues access tokens.
 */
export class X402Facilitator {
  private authorizedWallets = new Map<string, { balance: number; expiry: number }>();

  constructor(private config: {
    network: string;
    payTo: string;
    pricing: Record<string, number>;
  }) {}

  /**
   * Generates a 402 Payment Required response structure.
   */
  generatePaymentRequest(service: string): X402PaymentRequest {
    const amount = this.config.pricing[service] || 0.0001;
    return {
      amount: amount.toString(),
      currency: 'USDC',
      payTo: this.config.payTo,
      network: this.config.network,
      authToken: randomBytes(16).toString('hex')
    };
  }

  /**
   * Verifies a payment proof (Mock implementation for now).
   * In production, this would check the blockchain.
   */
  async verifyPayment(proof: X402Proof, request: X402PaymentRequest): Promise<boolean> {
    // In production:
    // 1. Verify txHash exists on this.config.network
    // 2. Verify tx destination is this.config.payTo
    // 3. Verify amount matches request.amount
    // 4. Verify tx is recent
    
    console.log(`[x402] Verifying payment ${proof.txHash} from ${proof.sender}`);
    
    // For now, auto-approve any txHash starting with "0x"
    if (proof.txHash.startsWith('0x')) {
      this.authorizedWallets.set(proof.sender, {
        balance: parseFloat(request.amount),
        expiry: Date.now() + 24 * 60 * 60 * 1000 // 24h access
      });
      return true;
    }
    return false;
  }

  /**
   * Checks if an agent has active credit.
   */
  hasAccess(agentWallet: string): boolean {
    const auth = this.authorizedWallets.get(agentWallet);
    if (!auth) return false;
    return auth.expiry > Date.now();
  }
}

/**
 * x402 Client used by the agent to handle 402 errors.
 */
export class X402Client {
  constructor(private agentWallet: any) {} // Agent's ERC-8004 wallet

  async handle402(paymentRequest: X402PaymentRequest): Promise<X402Proof> {
    console.log(`[x402] Agent ${this.agentWallet.address} initiating payment of ${paymentRequest.amount} ${paymentRequest.currency}`);
    
    // In production:
    // const tx = await this.agentWallet.sendTransaction({
    //   to: paymentRequest.payTo,
    //   value: parseUnits(paymentRequest.amount, 6)
    // });
    // return { txHash: tx.hash, sender: this.agentWallet.address, signature: ... };

    return {
      txHash: '0x' + randomBytes(32).toString('hex'),
      sender: '0xAgentWalletAddress',
      signature: 'mock_sig'
    };
  }
}
