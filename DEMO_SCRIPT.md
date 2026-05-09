# AgentBank V2 — Demo Day Script (5 minutes)

## Setup (Before Demo)

- Ensure all agents are running on Mantle mainnet
- Pre-fund balanced tier vault with 50 USDC
- Have Telegram bot ready (@AgentBankBot)
- Open subgraph playground in browser tab
- Open MantleScan in another tab

---

## Timeline

### 00:00 - 00:30 | Opening Hook

> "AgentBank has 5 AI wallets, 3 vault tiers, 4 different LLMs competing as analysts — all live on Mantle right now."

Show: Live vault stats via CLI
```bash
agentbank-cli vault stats -o json
```

### 00:30 - 01:00 | Subgraph Live Data

Show: Last 20 operations in The Graph playground
```graphql
{
  operations(first: 20, orderBy: timestamp, orderDirection: desc) {
    txHash
    pnl
    executor { agentType reputation }
    signal { signalType confidence }
  }
}
```

### 01:00 - 02:00 | Telegram Bot Live

- Display QR code for @AgentBankBot
- Show: /start → wallet creation
- Show: deposit flow (1 USDC from fresh account)
- Show: real-time decision feed in chat

### 02:00 - 02:30 | Byreal Skills CLI

```bash
npx skills add agentbank/skills
agentbank-cli vault stats
agentbank-cli catalog list -o json
agentbank-cli agents list -o json
```

> "Any LLM agent — Claude, ChatGPT, Cursor — can now operate our vault."

### 02:30 - 03:00 | ERC-8004 Demo

Show on MantleScan:
- IdentityRegistry: 4+ agents registered
- ReputationRegistry: feedback entries with scores
- ValidationRegistry: Guard → Executor validation log

```bash
agentbank-cli agents reputation --address 0x... -o json
```

### 03:00 - 03:30 | Verifiable Reasoning

Pull a recent OperationExecuted event:
1. Get `reasoningHash` from tx
2. Query LLMReasoningRegistry for full record
3. Show IPFS link with actual prompt + output
4. Recompute hash to prove integrity

```bash
npx hardhat run scripts/verify_reasoning.js -- 0x<reasoning_id>
```

### 03:30 - 04:00 | Slashing Demo

Show on testnet (pre-prepared):
- Analyst posts a bad signal
- Guard blocks → reputation decreases
- After 3 failures → slash 1% stake
- Insurance pool balance increases

### 04:00 - 04:30 | Multi-LLM Comparison

Show subgraph:
```graphql
{
  agents(where: { agentType: "analyst" }, orderBy: reputation, orderDirection: desc) {
    domain
    reputation
    totalSignalsPosted
  }
}
```

> "DeepSeek, Llama, and Qwen compete. Reputation is earned, not assigned."

### 04:30 - 05:00 | Closing

> "AgentBank is the first Mantle-native multi-agent economy that's also a Byreal Skills tool. Open analyst marketplace means anyone can deploy an AI analyst and compete for yield fees. Every decision — verifiable on-chain."

Show: Key numbers
- TVL across tiers
- Total ops executed / blocked ratio
- Agents registered
- Fees distributed

---

## Backup Plan

If live demo fails:
- Pre-recorded video of full flow (3 min)
- Screenshots of MantleScan transactions
- Subgraph JSON responses saved locally

## Key Talking Points for Q&A

1. **"Why multi-agent vs single?"** — Separation of concerns prevents single point of failure; Guard can't be compromised by same key as Executor
2. **"How is this different from Yearn?"** — Agents compete via marketplace; reasoning is verifiable; ERC-8004 gives portable reputation
3. **"What about MEV?"** — Tight slippage from fresh 1inch quotes; 30s validity window; Mantle L2 has minimal MEV
4. **"Is this production-ready?"** — Timelock + circuit breaker + insurance + slashing = institutional-grade safety stack
