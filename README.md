# AgentBank V3

> **Mantle Turing Test Hackathon 2026 · Agentic Wallets & Economy · $8,500 First Prize Bid**

The verifiable autonomous treasury. A multi-agent DeFi protocol on Mantle with decentralized AI inference (Allora + OpenGradient + TEE), hardware-attested LLM reasoning, intent-based solver auctions, cross-chain deposits via LayerZero V2, and a ve-tokenomics governance layer.

[![Deployed on Mantle](https://img.shields.io/badge/Deployed-Mantle%20Mainnet-00D395)](https://explorer.mantle.xyz)
[![Byreal Skills](https://img.shields.io/badge/Byreal-Skills%20Compatible-blue)](https://www.byreal.io)
[![ERC-8004](https://img.shields.io/badge/ERC--8004-Three%20Registries-purple)]()
[![ERC-4337](https://img.shields.io/badge/ERC--4337-Account%20Abstraction-orange)]()
[![LayerZero V2](https://img.shields.io/badge/LayerZero-V2%20OFT-blue)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## V3 Highlights

| Category | What's New | Modules |
|---|---|---|
| **Verifiable AI** | Decentralized inference via Allora Network + OpenGradient coprocessor + Phala Cloud TEE attestation | M19, M20 |
| **$ABNK Token** | ERC-20 with vote-escrow governance (veABNK), fee switch, gauge voting | M21 |
| **Intent Architecture** | CoW-style solver auction — users post intents, analysts bid execution paths | M24 |
| **Account Abstraction** | ERC-4337 smart accounts + session keys + sponsored gas via Pimlico | M25 |
| **Signal NFTs** | Every successful trade becomes ERC-721 tradable IP with Dutch auctions | M26 |
| **Cross-Chain** | LayerZero V2 OFT for vault shares, deposits from Ethereum/Arbitrum/BNB/Base | M27 |
| **Mechanism Hardening** | Anti-sybil (World ID), commit-reveal signals, Boltzmann exploration, multi-sig allocator | M28 |
| **Leaderboard PWA** | Next.js public dashboard with agent rankings, LLM head-to-head, live ops feed | M29 |
| **Telegram Mini App** | Full Web App SDK UX inside Telegram — deposit, withdraw, post intents, bridge | M30 |
| **Localization** | Korean + Chinese README, Mini App i18n | M32 |

---

## V2 Foundation (M01–M18)

| Module | What it does | Why it matters |
|---|---|---|
| Byreal Skills CLI (M01) | `npx skills add agentbank/skills` | Track-defining requirement |
| Vault V2 (M02) | ERC-4626 with real yield closure, selector whitelist | Fixes V1's broken yield path |
| ERC-8004 (M03) | Identity + Reputation + Validation (3 registries) | Standard says three; V1 had one |
| DEX Integration (M04) | 1inch + Merchant Moe + Agni Finance | Real swap execution on Mantle |
| Telegram Bot (M05) | Privy non-custodial wallets + decision feed | Consumer interface judges expect |
| Analyst Marketplace (M06) | Multi-agent economy with stake + fees | The "Economy" in the track name |
| RWA Strategy (M07) | Auto-allocate to USDY when DeFi yields drop | Mantle thesis aligned |
| Pyth Oracle (M08) | Real TWAP + anomaly detection | Live security, not just stubs |
| Verifiable LLM Reasoning (M09) | Hash-chained on-chain reasoning | Real on-chain benchmarking |
| Cross-Chain Byreal (M10) | Solana yield as Mantle context | Genuine Byreal CLI usage |
| Multi-Tier Vaults (M11) | Conservative / Balanced / Aggressive | Real product differentiation |
| Slashing & Insurance (M12) | Agents stake MNT, users covered | Skin-in-the-game |
| Timelock + Breaker (M13) | 48h param changes, auto-pause | Production safety |
| Mantle Native (M14) | mETH staking + COOK rewards | Ecosystem alignment |
| The Graph Subgraph (M15) | Indexed queries for all events | Data accessibility |
| MEV Protection (M16) | Tight slippage + private relay | Sandwich resistance |
| Permit2 Gasless (M17) | Sign-to-deposit, relayer pays gas | Zero-friction onboarding |
| Invariant & Fuzz Tests (M18) | Foundry + Hardhat comprehensive suite | Contract quality assurance |

---

## The Five Agents

| Agent | Role | Schedule |
|---|---|---|
| **Analyst** (x3) | Multi-model analysis (DeepSeek V3 + Llama 3 + Qwen) via decentralized inference router, generates strategy signals | Every 60 min (staggered) |
| **Executor** | Builds calldata via DEX adapter, submits to Guard, executes via vault | Every 15 min |
| **Guard** | Pre-flight risk (9 checks) + slashing enforcement + oracle validation | Real-time |
| **Allocator** | Multi-tier yield distribution + RWA rebalancing + intent settlement | Every 24h |
| **Circuit Breaker** | Monitors TVL drop, oracle deviation, block ratio anomalies | Real-time |

---

## V3 Architecture

```
                   ┌────────────────────────────────────────────────┐
                   │   $ABNK Token (M21)                            │
                   │   - veABNK governance                          │
                   │   - Fee switch on protocol revenue             │
                   │   - Optional analyst stake denomination        │
                   └─────────────────────┬──────────────────────────┘
                                         │
┌───────────────────────────────────────────────────────────────────┐
│  Intent Solver Auction (M24)                                       │
│  user posts intent → N analysts bid execution paths → best wins   │
└────────────────────────┬──────────────────────────────────────────┘
                         │
              [V2 stack: Vault / Agents / SignalBoard]
                         ▲
                         │
┌────────────────────────┴──────────────────────────────────────────┐
│  Verifiable AI Stack (M19 + M20)                                  │
│  ┌────────────────────────┐    ┌──────────────────────────────┐   │
│  │ Allora Topic Inference │    │ Phala Cloud TEE              │   │
│  │ - sentiment, price-dir │    │ - DeepSeek runs in enclave   │   │
│  │ - on-chain consensus   │    │ - Quote signed by Intel SGX  │   │
│  └────────────────────────┘    └──────────────────────────────┘   │
│  ┌────────────────────────┐    ┌──────────────────────────────┐   │
│  │ OpenGradient Coproc    │    │ Marlin Oyster (fallback)     │   │
│  │ - on-chain ML inference│    │ - Trustless agent compute     │   │
│  └────────────────────────┘    └──────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘

           Cross-chain inflow (M27)              UX layer
                         ▲                           ▲
                         │                           │
┌────────────────────────┴───┐    ┌──────────────────┴──────────────┐
│ LayerZero V2 OFT           │    │ TG Mini App + PWA Leaderboard   │
│ - bridge ABV2 shares       │    │  + AA Session Keys (M25,29,30)  │
│ - deposit from ETH/BNB/Arb │    │                                 │
└────────────────────────────┘    └─────────────────────────────────┘
```

---

## Smart Contracts

### Core (V2)

| Contract | Purpose |
|---|---|
| `AgentBankVaultV2.sol` | ERC-4626 vault with real yield, tiers, selector whitelist |
| `SignalBoardV2.sol` | On-chain signal bus with LLM reasoning hash |
| `DEXAdapter.sol` | Routes swaps through 1inch / Merchant Moe / Agni |
| `Permit2Deposit.sol` | Gasless deposit support via Uniswap Permit2 |

### V3 — Verifiable AI (M19, M20)

| Contract | Purpose |
|---|---|
| `AlloraConsumer.sol` | Reads Allora Network topic predictions on-chain |
| `OpenGradientReader.sol` | Verifies on-chain ML inference output with ZK proofs |
| `TEEAttestationVerifier.sol` | Verifies Phala/Marlin hardware attestation quotes |

### V3 — Token & Governance (M21)

| Contract | Purpose |
|---|---|
| `ABNKToken.sol` | ERC-20 with ERC20Votes + ERC20Permit, 100M max supply |
| `VotingEscrow.sol` | Curve-style vote-escrow (veABNK), 7d–4y lock |
| `FeeDistributor.sol` | Weekly buyback of ABNK with protocol revenue |

### V3 — Intent Architecture (M24)

| Contract | Purpose |
|---|---|
| `IntentRouter.sol` | Intent posting + 30-min solver auction |
| `SolverRegistry.sol` | Analyst-as-solver registration and staking |

### V3 — Account Abstraction (M25)

| Contract | Purpose |
|---|---|
| `AgentAccountFactory.sol` | ERC-4337 smart accounts with session keys |

### V3 — Signal NFTs (M26)

| Contract | Purpose |
|---|---|
| `SignalNFT.sol` | ERC-721 wrapping executed signals as tradable IP |
| `SignalAuctionHouse.sol` | Dutch auction marketplace for signal NFTs |

### V3 — Cross-Chain (M27)

| Contract | Purpose |
|---|---|
| `AgentBankOFT.sol` | LayerZero V2 OFT for omnichain vault shares |
| `CrossChainEntrypoint.sol` | Receive cross-chain deposits, issue OFT shares |

### V3 — Mechanism Hardening (M28)

| Contract | Purpose |
|---|---|
| `AntiSybilGuard.sol` | World ID / Gitcoin Passport sybil resistance |
| `CommitRevealSignal.sol` | 5-block commit-reveal to prevent self front-running |

### Identity (ERC-8004)

| Contract | Purpose |
|---|---|
| `IdentityRegistry.sol` | Agent identity, domain, metadata, lifecycle |
| `ReputationRegistry.sol` | Time-decayed reputation with authorized feedback |
| `ValidationRegistry.sol` | Agent-on-agent validation attestations |

### Economy

| Contract | Purpose |
|---|---|
| `AnalystRegistry.sol` | Multi-analyst marketplace with stake/unstake |
| `FeeDistributor.sol` | Performance fee distribution to winning analysts |
| `PerformanceTracker.sol` | Per-analyst metrics and Sharpe proxy |

### Strategies

| Contract | Purpose |
|---|---|
| `RWAStrategy.sol` | USDY allocation (T-bill yield on-chain) |
| `METHStakingStrategy.sol` | mETH liquid staking yield |

### Risk & Safety

| Contract | Purpose |
|---|---|
| `RiskOracle.sol` | Pyth-fed TWAP + anomaly detection |
| `SlashingPool.sol` | Agent MNT stake + slashing mechanics |
| `InsurancePool.sol` | User loss coverage from slashed funds |
| `CircuitBreaker.sol` | Auto-pause on threshold breach |
| `AgentBankTimelock.sol` | 48h governance delay |

---

## Project Structure

```
agentbank/
├── contracts/
│   ├── core/                  # VaultV2, SignalBoardV2, DEXAdapter, Permit2Deposit
│   ├── v3/                    # V3 contracts (M19-M28)
│   ├── identity/              # ERC-8004: Identity, Reputation, Validation
│   ├── risk/                  # RiskOracle, Slashing, Insurance, Breaker, Timelock
│   ├── economy/               # AnalystRegistry, FeeDistributor, PerformanceTracker
│   ├── strategies/            # RWAStrategy, METHStakingStrategy
│   ├── reasoning/             # LLMReasoningRegistry
│   ├── factory/               # MultiTierFactory
│   ├── interfaces/            # All interfaces
│   └── mocks/                 # MockERC20, MockDeFiProtocol
├── agents/                    # Python agent implementations
│   ├── analyst_agent.py       # Primary analyst (DeepSeek V3)
│   ├── analyst_alt_llama.py   # Llama 3 alternative analyst
│   ├── analyst_alt_qwen.py    # Qwen alternative analyst
│   ├── executor_agent.py      # DEX-aggregated execution
│   ├── guard_agent.py         # Risk + slashing enforcement
│   ├── allocator_agent.py     # Multi-tier allocation + RWA
│   └── circuit_breaker_agent.py
├── core/                      # Shared infrastructure
│   ├── chain.py               # Web3/Mantle connection
│   ├── llm.py                 # LLM API wrappers
│   ├── llm_ensemble.py        # Multi-LLM ensemble (V3)
│   ├── decentral_inference.py # Decentralized inference router (V3)
│   ├── tee_attestation.py     # TEE client (V3)
│   ├── llm_hasher.py          # Reasoning hash chain
│   ├── dex_adapter.py         # DEX aggregation routing
│   ├── pyth_client.py         # Pyth oracle client
│   ├── mev_protection.py      # MEV protection
│   ├── byreal_bridge.py       # Cross-chain Byreal bridge
│   ├── signal_bus.py          # SignalBoard interface
│   ├── identity.py            # Identity registry interface
│   └── strategies/
│       ├── rwa.py             # RWA strategy logic
│       └── meth.py            # mETH staking logic
├── solver/                    # V3 intent solver (M24)
│   └── intent_solver.py       # Watches intents, bids execution paths
├── infra/
│   ├── phala-tee/             # Phala Cloud TEE worker (M20)
│   │   ├── server.py          # FastAPI inference + attestation
│   │   ├── phala-app.yaml     # Phala deployment config
│   │   └── Dockerfile
│   └── allora-worker/         # Allora Network worker (M19)
│       ├── src/worker.py      # Publishes predictions to Allora
│       └── Dockerfile
├── skills/                    # Byreal Skills CLI (M01)
├── tg-bot/                    # Telegram bot (M05)
├── tg-miniapp/                # Telegram Mini App (M30)
│   └── src/                   # React + Vite + TWA SDK
├── pwa-leaderboard/           # Public leaderboard PWA (M29)
│   └── app/                   # Next.js 15 App Router
├── sdk/                       # Public SDK (M34)
│   ├── typescript/            # @agentbank/sdk (npm)
│   └── python/                # agentbank-py (PyPI)
├── subgraph/                  # The Graph subgraph (M15)
├── subgraph-extensions/       # V3 subgraph extensions
├── docs/
│   ├── MECHANISM_DESIGN.md    # Formal mechanism analysis (M28)
│   ├── TOKENOMICS.md          # $ABNK token economics (M21)
│   └── ARCHITECTURE_V3.md     # V3 architecture overview
├── test/
│   ├── v3/                    # V3 contract tests (Foundry)
│   ├── unit/                  # Per-contract unit tests
│   ├── integration/           # Full cycle + multi-analyst
│   ├── fork/                  # Mantle mainnet fork tests
│   ├── invariants/            # Solvency, accounting invariants
│   └── fuzz/                  # Signal fuzzing
├── deployments/               # Saved deployment addresses
├── orchestrator.py            # Main agent scheduler entry point
├── config.py                  # Configuration & env vars
├── hardhat.config.js
├── foundry.toml
├── package.json
├── requirements.txt
├── README.md                  # This file (English)
├── README.kr.md               # Korean (M32)
├── README.zh.md               # Chinese (M32)
├── DEMO_SCRIPT.md
└── LICENSE
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Git
- Foundry (for V3 tests)

### Installation

```bash
git clone https://github.com/0xCaptain888/agentbank
cd agentbank

# Install Solidity/Hardhat dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Install Skills CLI
cd skills && npm install && npm run build && cd ..

# Install Telegram bot
cd tg-bot && npm install && cd ..

# Install TG Mini App
cd tg-miniapp && npm install && cd ..

# Install PWA Leaderboard
cd pwa-leaderboard && npm install && cd ..
```

### Configuration

```bash
cp .env.example .env
# Fill in:
#   OWNER_PRIVATE_KEY (deployer wallet)
#   ANALYST_PRIVATE_KEY, EXECUTOR_PRIVATE_KEY, GUARD_PRIVATE_KEY, ALLOCATOR_PRIVATE_KEY
#   DEEPSEEK_API_KEY, TOGETHER_API_KEY, DASHSCOPE_API_KEY
#   TELEGRAM_BOT_TOKEN, PRIVY_APP_ID, PRIVY_APP_SECRET
#   ONEINCH_API_KEY
#   PYTH_ENDPOINT
#   ALLORA_TOPIC_ID, WORKER_PRIVATE_KEY
#   PHALA_TEE_URL
#   PIMLICO_KEY
```

### Compile & Test

```bash
# Hardhat
npx hardhat compile
npx hardhat test

# Foundry (V3 tests)
forge test --fuzz-runs 1000
forge test --match-path test/v3/

# Coverage
forge coverage
```

### Deploy

```bash
# Testnet
npx hardhat run scripts/deploy_v2_testnet.js --network mantle_sepolia

# Mainnet
npx hardhat run scripts/deploy_v2_mainnet.js --network mantle

# V3 contracts
npx hardhat run scripts/deploy_v3.js --network mantle
```

### Run Agents

```bash
python orchestrator.py
```

### Telegram Bot & Mini App

```bash
cd tg-bot && npm start
cd tg-miniapp && npm run dev
```

### Skills CLI

```bash
npx skills add agentbank/skills
agentbank-cli vault stats -o json
agentbank-cli catalog list
agentbank-cli signals list --status pending --limit 5 -o json
```

---

## Verifiable AI Pipeline

AgentBank's analyst LLM runs inside an Intel SGX enclave on Phala Cloud. Every decision posts a hardware-signed attestation quote on-chain:

```
Prompt → Phala TEE Enclave (DeepSeek V3) → Output + SGX Quote
                                                    │
                                                    ▼
                                    TEEAttestationVerifier.sol
                                    (verify quote signature on-chain)
                                                    │
                                                    ▼
                              Proven: this code + this model + this input = this output
```

Additionally, AgentBank consumes **and contributes** predictions to Allora Network, making it both a user and a worker in the decentralized inference economy.

---

## Intent-Based Architecture (M24)

Users post intents, solvers (analyst agents) compete to fulfill them:

1. User: "I want 8% on $500 for 30d, max 5% loss"
2. IntentRouter receives intent + USDC
3. 30-minute auction: solvers bid execution paths
4. Highest APY bid wins, USDC deposited into selected vault tier
5. After duration: actual APY checked, solver bond slashed or returned

---

## $ABNK Tokenomics

| Field | Value |
|---|---|
| Symbol | ABNK |
| Standard | ERC-20 + ERC20Votes + ERC20Permit |
| Total Supply | 100,000,000 (fixed) |
| Lock Model | Curve-style veABNK (7d–4y) |
| Fee Switch | 50% protocol revenue → ABNK buyback → veABNK holders |
| Gauge Voting | veABNK holders vote weekly on strategy emissions |

See [docs/TOKENOMICS.md](docs/TOKENOMICS.md) for full distribution and vesting schedule.

---

## Cross-Chain (M27)

Deposit from any chain, hold shares anywhere:

```
User on Arbitrum → CrossChainEntrypoint (Arb) → LayerZero V2 → Mantle Vault
                                                                      │
                                                              ABV2 OFT minted
                                                                      │
                                                    ◀─── LayerZero V2 ───
                                                                      │
                                                    User holds ABV2 on Arbitrum
```

Supported chains: Ethereum, Arbitrum, BNB Chain, Base.

---

## Security

- **TEE Attestation**: Hardware-verified LLM execution (Phala Cloud + Marlin Oyster)
- **Anti-Sybil**: World ID / Gitcoin Passport verified humanity for analysts
- **Commit-Reveal**: 5-block delay prevents analyst self-front-running
- **Multi-sig Allocator**: 2-of-3 quorum for signal selection
- **Circuit Breaker**: Auto-pauses all operations on threshold breach
- **48h Timelock**: All governance/parameter changes delayed
- **Agent Slashing**: Bad actors lose staked MNT
- **Insurance Pool**: Covers user losses from agent failures
- **MEV Protection**: Fresh quotes with 30s validity + tight slippage
- **Selector Whitelist**: Only pre-approved function calls can execute
- **Session Key Caps**: ERC-4337 agents limited to $100/day spend
- **Invariant Tests**: Foundry + Echidna, 100k+ runs, 0 violations

---

## SDK

Build your own analyst agent in 30 lines:

```typescript
import { AgentBankClient } from "@agentbank/sdk";

const client = new AgentBankClient({ rpc: "https://rpc.mantle.xyz", privateKey: process.env.KEY });

await client.analyst.register({ stake: "100", domain: "alice.analyst.eth" });

while (true) {
  const pools = await client.market.getPools({ minTvl: 100_000 });
  const top = pools.sort((a, b) => b.apy - a.apy)[0];
  if (top.apy > 15) {
    await client.signal.commit({ type: "lp", protocol: "merchant_moe", pool: top.address, confidence: 70 });
  }
  await new Promise(r => setTimeout(r, 60_000));
}
```

Available on npm (`@agentbank/sdk`) and PyPI (`agentbank-py`).

---

## Documentation

- [Architecture V3](docs/ARCHITECTURE_V3.md) — Full system design with diagrams
- [Mechanism Design](docs/MECHANISM_DESIGN.md) — Game-theoretic analysis, Nash equilibria
- [Tokenomics](docs/TOKENOMICS.md) — $ABNK supply, distribution, veABNK mechanics
- [Demo Script](DEMO_SCRIPT.md) — 5-minute demo day walkthrough

---

## Localization

- [한국어 README](README.kr.md) (Korean)
- [中文 README](README.zh.md) (Chinese)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Chain** | Mantle (chainId 5000/5003) |
| **Contracts** | Solidity ^0.8.24, OpenZeppelin v5, Hardhat + Foundry |
| **Agents** | Python 3.11, web3.py, APScheduler |
| **LLMs** | DeepSeek V3, Llama 3 (Groq), Qwen 2.5 (DashScope), Allora Network |
| **TEE** | Phala Cloud (Intel SGX) + Marlin Oyster |
| **Oracles** | Pyth Network + Allora + OpenGradient |
| **DEX** | 1inch, Merchant Moe v2, Agni Finance v3 |
| **Standards** | ERC-4626, ERC-8004, ERC-4337, ERC-721, LayerZero OFT |
| **Token** | $ABNK (veABNK governance, Curve-style) |
| **CLI** | Byreal Skills standard |
| **Bot** | Telegraf + Privy + Telegram Mini App (TWA SDK) |
| **Frontend** | Next.js 15 PWA + Vite React Mini App |
| **Cross-Chain** | LayerZero V2 (Ethereum, Arbitrum, BNB, Base) |
| **AA** | ERC-4337 + Pimlico paymaster + session keys |
| **Indexing** | The Graph (subgraph + extensions) |
| **Testing** | Hardhat + Foundry (invariant/fuzz) + Slither |
| **RWA** | USDY (Ondo) + mETH (Mantle LST) |

---

## License

MIT — see [LICENSE](LICENSE)
