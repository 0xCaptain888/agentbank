# @agentbank/sdk

TypeScript SDK for interacting with the AgentBank V3 protocol.

## Installation

```bash
npm install @agentbank/sdk viem
# or
pnpm add @agentbank/sdk viem
```

## Quick Start

```typescript
import { AgentBankClient } from "@agentbank/sdk";
import { createPublicClient, createWalletClient, http } from "viem";
import { mantle } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0x...");

const publicClient = createPublicClient({
  chain: mantle,
  transport: http("https://rpc.mantle.xyz"),
});

const walletClient = createWalletClient({
  chain: mantle,
  transport: http("https://rpc.mantle.xyz"),
  account,
});

const client = new AgentBankClient({
  publicClient,
  walletClient,
  addresses: {
    vault: "0x...",
    signalBoard: "0x...",
    intentRouter: "0x...",
    teeVerifier: "0x...",
  },
});
```

## Modules

### Vault

Interact with ERC-4626 vaults for deposits and withdrawals.

```typescript
// Deposit 1000 USDY
const txHash = await client.vault.deposit({ amount: "1000" });

// Check shares balance
const shares = await client.vault.getShares(account.address);

// Get TVL
const tvl = await client.vault.getTVL();

// Estimate APY
const apy = await client.vault.getAPY();

// Withdraw
await client.vault.withdraw({ amount: "500" });
```

### Analyst

Register as an analyst, post trading signals, and query reputation.

```typescript
// Register
await client.analyst.register();

// Post a long signal on WETH
await client.analyst.postSignal({
  asset: "0x...", // WETH address
  direction: 1, // long
  magnitude: 750, // 7.5% confidence
  reasoning: "RSI divergence on 4H timeframe",
  ttl: 7200, // 2 hours
});

// Check reputation
const rep = await client.analyst.getReputation(account.address);
console.log(`Score: ${rep.score}, Win rate: ${rep.profitableSignals}/${rep.totalSignals}`);
```

### Intent

Post deposit intents and participate in solver auctions.

```typescript
// Post an intent
await client.intent.postIntent({
  asset: "0x...", // USDY
  amount: "10000",
  minApyBps: 500, // 5% min APY
  maxDrawdownBps: 200, // 2% max drawdown
  duration: 30 * 86400, // 30 days
});

// As a solver, submit a bid
await client.intent.submitBid({
  intentId: 1n,
  tierVault: "0x...",
  promisedApy: 650, // 6.5%
  bondAmount: "1000",
});

// Settle after auction ends
await client.intent.settleAuction(1n);

// Query open intents
const openIntents = await client.intent.getOpenIntents();
```

### Attestation

Verify TEE-attested agent runs on-chain.

```typescript
import { TEEKind } from "@agentbank/sdk";

// Submit attestation
await client.attestation.verifyRun({
  kind: TEEKind.Phala,
  promptHash: "0x...",
  outputHash: "0x...",
  codeHash: "0x...",
  signature: "0x...",
});

// Check if a run is verified
const runId = client.attestation.computeRunId(promptHash, outputHash, codeHash);
const verified = await client.attestation.isVerified(runId);

// Batch check
const runs = await client.attestation.getAttestedRuns([runId1, runId2]);
```

## Read-Only Usage

All clients support read-only mode (no `walletClient`). Write operations will throw if no wallet is configured.

```typescript
const readOnlyClient = new AgentBankClient({
  publicClient,
  addresses: { /* ... */ },
});

// This works
const tvl = await readOnlyClient.vault.getTVL();

// This throws
await readOnlyClient.vault.deposit({ amount: "100" }); // Error!
```

## License

MIT
