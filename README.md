# AgentBank V2

> **Mantle Turing Test Hackathon 2026 · Agentic Wallets & Economy · $8,500 First Prize Bid**

A multi-agent autonomous treasury on Mantle, with a Byreal-Skills-compatible CLI, full ERC-8004 implementation across three registries, an analyst marketplace where agents stake MNT and earn fees, and verifiable LLM reasoning anchored on-chain.

[![Deployed on Mantle](https://img.shields.io/badge/Deployed-Mantle%20Mainnet-00D395)](https://explorer.mantle.xyz)
[![Byreal Skills](https://img.shields.io/badge/Byreal-Skills%20Compatible-blue)](https://www.byreal.io)
[![ERC-8004](https://img.shields.io/badge/ERC--8004-Three%20Registries-purple)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What's New in V2

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
| **Analyst** (x3) | Multi-model analysis (DeepSeek V3 + Llama 3 + Qwen), generates strategy signals | Every 60 min (staggered) |
| **Executor** | Builds calldata via DEX adapter, submits to Guard, executes via vault | Every 15 min |
| **Guard** | Pre-flight risk (9 checks) + slashing enforcement + oracle validation | Real-time |
| **Allocator** | Multi-tier yield distribution + RWA rebalancing + strategy deployment | Every 24h |
| **Circuit Breaker** | Monitors TVL drop, oracle deviation, block ratio anomalies | Real-time |

---

## Architecture

```
                          ┌────────────────────────────────┐
                          │  Telegram Bot (M05)            │
                          │  - Deposit/Withdraw            │
                          │  - Decision Feed               │
                          │  - Privy Non-Custodial Wallet  │
                          └────────────┬───────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AgentBank Vault V2 (M02, M11)                │
│   - ERC-4626 with real yield via assets/share appreciation       │
│   - 3 tiers: Conservative / Balanced / Aggressive                │
│   - Selector-whitelist on every external call                    │
│   - Pre/post balance check (no draining via OperationFailed)     │
└────┬───────────────────────────────────────────────────────┬────┘
     │                                                        │
     │ executeOperation                                       │ readState
     ▼                                                        ▼
┌──────────────────┐         ┌──────────────────────────────────┐
│ DEX Adapter (M04)│         │  Allocator V2                    │
│ - 1inch / 0x     │         │  - Decides: DeFi LP / RWA / mETH │
│ - Direct routers │◀────────│  - Time-weighted rebalance       │
│ - Permit2 (M17)  │         │  - Reads RWA prices (M07)        │
└──────────────────┘         └──────────────────────────────────┘
     ▲
     │
┌────────────────────────┐         ┌─────────────────────────────┐
│ Executor Agent V2      │         │ AnalystRegistry V2 (M06)    │
│ - Builds calldata      │◀────────│ - N analysts compete         │
│ - Submits to Guard     │         │ - Reputation-weighted vote   │
│ - Logs LLM hash (M09)  │         │ - Fee distribution to winners│
└─────────────┬──────────┘         └─────────────────────────────┘
              │                                        ▲
              ▼                                        │
┌────────────────────────┐         ┌──────────────────┴─────────┐
│ Guard Agent V2         │         │ N Analyst Agents            │
│ - Pyth oracle (M08)    │         │ - DeepSeek / Llama / Qwen   │
│ - Slashing (M12)       │         │ - Cross-chain Byreal (M10)  │
│ - Validation Registry  │         │ - LLM hash chain (M09)      │
└────────────────────────┘         └────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ERC-8004 Three Registries (M03)                                │
│  - IdentityRegistry: agent addresses, types, metadata           │
│  - ReputationRegistry: feedback authorizations + scores         │
│  - ValidationRegistry: agent-on-agent validation events         │
└─────────────────────────────────────────────────────────────────┘

   All events indexed by → The Graph Subgraph (M15)
```

---

## Smart Contracts

### Core

| Contract | Purpose |
|---|---|
| `AgentBankVaultV2.sol` | ERC-4626 vault with real yield, tiers, selector whitelist |
| `SignalBoardV2.sol` | On-chain signal bus with LLM reasoning hash |
| `DEXAdapter.sol` | Routes swaps through 1inch / Merchant Moe / Agni |
| `Permit2Deposit.sol` | Gasless deposit support via Uniswap Permit2 |

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

### Other

| Contract | Purpose |
|---|---|
| `LLMReasoningRegistry.sol` | On-chain hash chain for LLM decisions |
| `MultiTierFactory.sol` | Deploys per-tier vaults |

---

## Project Structure

```
agentbank/
├── contracts/
│   ├── core/                  # VaultV2, SignalBoardV2, DEXAdapter, Permit2Deposit
│   ├── identity/              # ERC-8004: Identity, Reputation, Validation
│   ├── risk/                  # RiskOracle, Slashing, Insurance, Breaker, Timelock
│   ├── economy/               # AnalystRegistry, FeeDistributor, PerformanceTracker
│   ├── strategies/            # RWAStrategy, METHStakingStrategy
│   ├── reasoning/             # LLMReasoningRegistry
│   ├── factory/               # MultiTierFactory
│   ├── interfaces/            # IPyth, IUSDY, IMETH, IDEXAdapter, IStrategy, etc.
│   └── mocks/                 # MockERC20, MockDeFiProtocol
├── agents/                    # Python agent implementations
│   ├── analyst_agent.py       # Primary analyst (DeepSeek V3)
│   ├── analyst_alt_llama.py   # Llama 3 alternative analyst
│   ├── analyst_alt_qwen.py    # Qwen alternative analyst
│   ├── executor_agent.py      # DEX-aggregated execution
│   ├── guard_agent.py         # Risk + slashing enforcement
│   ├── allocator_agent.py     # Multi-tier allocation + RWA
│   └── circuit_breaker_agent.py # System health monitor
├── core/                      # Shared infrastructure
│   ├── chain.py               # Web3/Mantle connection
│   ├── llm.py                 # LLM API wrappers
│   ├── llm_hasher.py          # Reasoning hash chain (M09)
│   ├── dex_adapter.py         # DEX aggregation routing (M04)
│   ├── pyth_client.py         # Pyth oracle client (M08)
│   ├── mev_protection.py      # MEV protection (M16)
│   ├── byreal_bridge.py       # Cross-chain Byreal bridge (M10)
│   ├── signal_bus.py          # SignalBoard interface
│   ├── identity.py            # Identity registry interface
│   └── strategies/
│       ├── rwa.py             # RWA strategy logic (M07)
│       └── meth.py            # mETH staking logic (M14)
├── skills/                    # Byreal Skills CLI (M01)
│   ├── src/
│   │   ├── cli.ts             # Entry point
│   │   └── commands/          # vault, signal, agent, analyst, tier, catalog, wallet, risk, skill
│   ├── dist/                  # Compiled JS
│   ├── SKILL.md               # Byreal standard documentation
│   └── package.json
├── tg-bot/                    # Telegram bot (M05)
│   ├── src/
│   │   ├── bot.ts             # Bot entry
│   │   ├── handlers/          # deposit, withdraw, stats, agents, signals
│   │   ├── services/          # privy, vault
│   │   └── events/            # on-chain event listener
│   └── package.json
├── subgraph/                  # The Graph subgraph (M15)
│   ├── schema.graphql         # Entity definitions
│   ├── subgraph.yaml          # Data source config
│   └── src/                   # AssemblyScript mappings
├── scripts/
│   ├── deploy_v2_testnet.js   # Testnet deployment
│   ├── deploy_v2_mainnet.js   # Mainnet deployment
│   ├── migrate_v1_to_v2.js    # V1 → V2 migration
│   ├── seed_initial_state.js  # Post-deploy seeding
│   ├── verify_all.js          # Contract verification
│   └── verify_reasoning.js    # LLM hash chain verification
├── test/
│   ├── unit/                  # Per-contract unit tests
│   ├── integration/           # Full cycle + multi-analyst
│   ├── fork/                  # Mantle mainnet fork tests
│   ├── invariants/            # Solvency, accounting invariants
│   └── fuzz/                  # Signal fuzzing
├── deployments/               # Saved deployment addresses
├── orchestrator.py            # Main agent scheduler entry point
├── config.py                  # Configuration & env vars
├── hardhat.config.js          # Hardhat (Solidity 0.8.27, Cancun, viaIR)
├── foundry.toml               # Foundry (invariant + fuzz testing)
├── package.json
├── requirements.txt
├── DEMO_SCRIPT.md             # 5-minute demo day script
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Git

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
```

### Compile & Test

```bash
# Hardhat
npx hardhat compile
npx hardhat test
npx hardhat test test/unit/
npx hardhat test test/integration/
npx hardhat test test/invariants/

# Foundry (if installed)
forge test --fuzz-runs 1000
```

### Deploy

```bash
# Testnet
npx hardhat run scripts/deploy_v2_testnet.js --network mantle_sepolia

# Seed initial state
npx hardhat run scripts/seed_initial_state.js --network mantle_sepolia

# Verify contracts
npx hardhat run scripts/verify_all.js --network mantle_sepolia

# Mainnet
npx hardhat run scripts/deploy_v2_mainnet.js --network mantle
```

### Run Agents

```bash
python orchestrator.py
```

### Telegram Bot

```bash
cd tg-bot && npm start
```

### Skills CLI

```bash
# Install globally
npm install -g @agentbank/skills

# Or use directly
cd skills
node dist/cli.js vault stats -o json
node dist/cli.js catalog list -o json
node dist/cli.js agents list -o json
node dist/cli.js analyst list -o json
node dist/cli.js risk check --signal-id 0x123 -o json
```

---

## Byreal Skills CLI

AgentBank is consumable by any Byreal Skills-aware LLM agent:

```bash
npx skills add agentbank/skills
agentbank-cli vault stats -o json
agentbank-cli catalog list
agentbank-cli signals list --status pending --limit 5 -o json
agentbank-cli tier deposit --tier balanced --amount 100 --confirm
agentbank-cli agents validate --target 0xABC --feedback approve --reason "consistent_alpha" -o json
```

All commands support `-o json` for structured output. See `skills/SKILL.md` for full documentation.

---

## Risk Management

The Guard Agent enforces 9 deterministic risk checks before every operation:

1. **Protocol Whitelist** — target contract must be whitelisted
2. **Selector Whitelist** — function selector must be approved on-chain
3. **Amount Limit** — max 10% of vault TVL per single operation
4. **Slippage Check** — max slippage enforced via DEX adapter quote
5. **Confidence Threshold** — signal must have >= 70% analyst confidence
6. **Liquidity Check** — pool must have sufficient TVL for trade size
7. **Oracle Deviation** — price within 5% of Pyth 1h TWAP
8. **Daily PnL** — vault not in drawdown beyond tier threshold
9. **Circuit Breaker** — system must not be paused

Failed checks result in:
- Operation blocked on-chain (`OperationBlocked` event)
- ValidationRegistry entry created
- Reputation penalty for responsible agent
- Potential stake slashing for repeated failures

---

## The Agent Economy

```
Analyst stakes 100 MNT → Posts signal → Allocator picks (reputation-weighted)
                                              │
                                    Executor executes via vault
                                              │
                                    ┌─────────┴─────────┐
                                    │                     │
                              PnL > 0                PnL < 0
                                    │                     │
                         5% fee → Analyst        1% stake slashed
                         +Rep feedback            -Rep feedback
                                                  50% → Insurance
```

Anyone can deploy an Analyst agent and compete in the marketplace. No permissioned entry — stake MNT, post signals, earn fees if your signals generate alpha.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Chain** | Mantle (chainId 5000/5003) |
| **Contracts** | Solidity ^0.8.24, OpenZeppelin v5, Hardhat + Foundry |
| **Agents** | Python 3.11, web3.py, APScheduler |
| **LLMs** | DeepSeek V3, Llama 3 (Groq), Qwen 2.5 (DashScope) |
| **Oracles** | Pyth Network (real-time + TWAP + anomaly) |
| **DEX** | 1inch Aggregation Router, Merchant Moe v2, Agni Finance v3 |
| **Standards** | ERC-4626, ERC-8004 (three registries), Permit2 |
| **CLI** | Byreal Skills standard (TypeScript, Commander.js) |
| **Bot** | Telegraf + Privy embedded wallets |
| **Indexing** | The Graph (subgraph with 7 data sources) |
| **Testing** | Hardhat (unit/integration) + Foundry (invariant/fuzz) |
| **RWA** | USDY (Ondo) + mETH (Mantle LST) |

---

## Security

- **Circuit Breaker**: Auto-pauses all operations on daily PnL breach
- **48h Timelock**: All governance/parameter changes delayed
- **Agent Slashing**: Bad actors lose staked MNT
- **Insurance Pool**: Covers user losses from agent failures (funded by slashing)
- **MEV Protection**: Fresh quotes with 30s validity + tight minAmountOut
- **Selector Whitelist**: Only pre-approved (target, selector) pairs can execute
- **Pre/Post Balance Assertion**: Every operation verified at contract level
- **Multi-model Consensus**: No single LLM point of failure
- **Permit2 Gasless**: Users never expose private keys for deposits
- **14-day Unstake Delay**: Agents cannot quickly exit after bad behavior

---

## Subgraph Queries

```graphql
# Last 10 operations with reasoning
{
  operations(first: 10, orderBy: timestamp, orderDirection: desc) {
    txHash
    pnl
    executor { agentType reputation }
    signal { signalType confidence reasoning }
    reasoning { storageURI }
  }
}

# Agent leaderboard
{
  agents(orderBy: reputation, orderDirection: desc) {
    domain
    reputation
    totalSignalsPosted
    totalOpsExecuted
  }
}

# Daily PnL chart data
{
  dailyStats(first: 30, orderBy: id, orderDirection: desc) {
    id pnl opsExecuted opsBlocked
  }
}
```

---

## License

MIT — see [LICENSE](LICENSE)
