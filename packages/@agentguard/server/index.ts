import express from 'express';
import { AgentGuard } from '../core/index.js';
import { X402Facilitator } from '../x402/index.js';

const app = express();
app.use(express.json());

const guard = new AgentGuard({
  taintEnabled: true,
  promptShield: { enabled: true }
});

const facilitator = new X402Facilitator({
  network: 'base',
  payTo: process.env.PAY_TO_ADDRESS || '0x...',
  pricing: { checkpoint: 0.0001 }
});

app.post('/checkpoint', async (req, res) => {
  const { state, agentWallet } = req.body;

  // If x402 is enabled, check access
  if (process.env.ENABLE_X402 === 'true') {
    if (!facilitator.hasAccess(agentWallet)) {
      const paymentRequest = facilitator.generatePaymentRequest('checkpoint');
      return res.status(402).json(paymentRequest);
    }
  }

  try {
    const cleanState = await guard.checkpoint(state);
    res.json({ cleanState });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/x402/verify', async (req, res) => {
  const { proof, request } = req.body;
  const success = await facilitator.verifyPayment(proof, request);
  res.json({ success });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AgentGuard Server running on port ${PORT}`);
});
