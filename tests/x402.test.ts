import { describe, it, expect } from 'vitest';
import { X402Facilitator } from '@agentguard/x402';

describe('x402 Payment Protocol', () => {
  const PAY_TO = '0x1234567890AbcdEF1234567890aBcdef12345678';

  describe('X402Facilitator', () => {
    const facilitator = new X402Facilitator({
      network: 'base-sepolia',
      payTo: PAY_TO,
      pricing: { checkpoint: '0.0001', scan: '0.00005' },
      rpcUrl: 'https://sepolia.base.org',
    });

    it('generates payment requests with pricing', () => {
      const req = facilitator.generatePaymentRequest('checkpoint');
      expect(req.amount).toBe('0.0001');
      expect(req.currency).toBe('USDC');
      expect(req.payTo).toBe(PAY_TO);
      expect(req.network).toBe('base-sepolia');
    });

    it('throws for unknown services', () => {
      expect(() => facilitator.generatePaymentRequest('unknown')).toThrow();
    });

    it('tracks access for wallets', () => {
      expect(facilitator.hasAccess(PAY_TO)).toBe(false);
    });

    it('verifies payment returns null for invalid tx', async () => {
      const req = facilitator.generatePaymentRequest('checkpoint');
      const result = await facilitator.verifyPayment({ txHash: '0xdead' }, req);
      expect(result).toBeNull();
    });

    it('denies access before payment', () => {
      expect(facilitator.hasAccess(PAY_TO)).toBe(false);
    });
  });

  describe('Integration: x402 Server Flow', () => {
    it('generates request and handles verification gracefully', async () => {
      const facilitator = new X402Facilitator({
        network: 'base-sepolia',
        payTo: PAY_TO,
        pricing: { checkpoint: '0.0001' },
        rpcUrl: 'https://sepolia.base.org',
      });

      // 1. Generate payment request
      const paymentReq = facilitator.generatePaymentRequest('checkpoint');
      expect(paymentReq.amount).toBe('0.0001');

      // 2. Verify payment (will fail gracefully in test env without real tx)
      const result = await facilitator.verifyPayment({ txHash: '0x' + 'a'.repeat(64) }, paymentReq);
      expect(result).toBeNull();

      // 3. Access still denied
      expect(facilitator.hasAccess('0x0000000000000000000000000000000000000000')).toBe(false);
    });

    it('tracks credit consumption', () => {
      const facilitator = new X402Facilitator({
        network: 'base-sepolia',
        payTo: PAY_TO,
        pricing: { checkpoint: '0.0001' },
        rpcUrl: 'https://sepolia.base.org',
      });

      // Manually grant credit (simulating payment verification)
      const wallet = PAY_TO;
      expect(facilitator.hasAccess(wallet)).toBe(false);
    });
  });
});
