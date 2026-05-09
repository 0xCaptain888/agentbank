# AgentBank V2

> Four AI agents autonomously managing an on-chain treasury on Mantle.
> Every decision is recorded on-chain with verifiable LLM reasoning hash chains.

**Mantle Turing Test Hackathon 2026 | Agentic Wallets & Economy Track**

[![Deployed on Mantle](https://img.shields.io/badge/Deployed-Mantle%20Mainnet-00D395)](https://explorer.mantle.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What is AgentBank?

AgentBank is the first multi-agent autonomous treasury on Mantle. Users deposit USDC and four specialized AI agents — Analyst, Executor, Guard, and Allocator — collaboratively manage funds across DeFi protocols with full on-chain transparency.

**V2 Key Upgrades:**

- Multi-tier vaults (Conservative / Balanced / Aggressive)
- ERC-8004 compliant three-registry identity system
- LLM reasoning hash chain for verifiable AI decisions
- DEX aggregation (1inch + Merchant Moe + Agni Finance)
- Pyth oracle TWAP + anomaly detection
- Agent slashing/insurance pool economics
- Multi-model consensus (DeepSeek V3 + Llama 3 + Qwen)
- Circuit breaker + 48h timelock for production safety
- Telegram bot with Privy non-custodial wallets
- Byreal Skills CLI standard compliance
- The Graph subgraph for indexed queries

---

## The Four Agents

| Agent | Role | Schedule |
|---|---|---|
| **Analyst** | Multi-model analysis (DeepSeek + Llama + Qwen), generates strategy signals | Every 60 min |
| **Executor** | Executes via DEX aggregator with MEV protection | Every 15 min |
| **Guard** | Pre-flight risk (9 checks) + slashing enforcement | Real-time |
| **Allocator** | Multi-tier yield distribution + RWA rebalancing | Every 24h |
| **Circuit Breaker** | Monitors PnL drawdown, auto-pauses system | Real-time |

---

## Architecture

```
User deposits USDC -> MultiTierFactory (Conservative/Balanced/Aggressive)
                              |
                    AgentBankVaultV2 (ERC-4626)
                              |
                    SignalBoardV2 (on-chain + reasoning hash)
                   /              \
            Analyst(s)          Executor
       (multi-model consensus)  (DEX aggregation)
                                    |
                              Guard Agent ──── RiskOracle (Pyth TWAP)
                           (approve / slash)
                                    |
                          executeOperation()
                                    |
                       ┌────────────┼────────────┐
                 Allocator    CircuitBreaker    InsurancePool
              (yield dist)   (auto-pause)      (user coverage)
```

### Verifiable AI Decisions

Every LLM decision is hashed and chained:
```
hash_n = SHA256(prompt + response + timestamp + hash_{n-1})
```
Submitted to `LLMReasoningRegistry` on-chain. Anyone can verify the complete decision history.

### ERC-8004 Identity System (Three Registries)

| Registry | Purpose |
|---|---|
| **IdentityRegistry** | Agent registration, metadata, lifecycle |
| **ReputationRegistry** | Score with time decay, feedback from validators |
| **ValidationRegistry** | Agent-to-agent validation attestations |

---

## Smart Contracts

### Core Contracts

| Contract | Description |
|---|---|
| `AgentBankVaultV2` | ERC-4626 vault with selector whitelist, daily PnL, circuit breaker |
| `SignalBoardV2` | Signal bus with reasoning hash support |
| `DEXAdapter` | 1inch + Merchant Moe routing |

### Identity Contracts (ERC-8004)

| Contract | Description |
|---|---|
| `IdentityRegistry` | Agent registration and metadata |
| `ReputationRegistry` | Time-decayed reputation scoring |
| `ValidationRegistry` | Agent-to-agent attestations |

### Risk Contracts

| Contract | Description |
|---|---|
| `RiskOracle` | Pyth TWAP + anomaly detection |
| `SlashingPool` | Agent stake and slashing |
| `InsurancePool` | User insurance fund |
| `CircuitBreaker` | Auto-pause on threshold breach |
| `AgentBankTimelock` | 48h governance timelock |

### Economy & Strategy

| Contract | Description |
|---|---|
| `AnalystRegistry` | Multi-analyst marketplace with stake |
| `MultiTierFactory` | Conservative/Balanced/Aggressive vault deployment |
| `RWAStrategy` | USDY-style yield strategy |
| `LLMReasoningRegistry` | On-chain hash chain for LLM decisions |

---

## Project Structure

```
agentbank/
├── contracts/
│   ├── core/                  # AgentBankVaultV2, SignalBoardV2, DEXAdapter
│   ├── identity/              # IdentityRegistry, ReputationRegistry, ValidationRegistry
│   ├── risk/                  # RiskOracle, SlashingPool, InsurancePool, CircuitBreaker, Timelock
│   ├── economy/               # AnalystRegistry
│   ├── strategies/            # RWAStrategy
│   ├── reasoning/             # LLMReasoningRegistry
│   ├── factory/               # MultiTierFactory
│   ├── interfaces/            # All interfaces
│   └── mocks/                 # Test mocks
├── agents/                    # Python agent implementations
│   ├── base_agent.py          # Abstract base class
│   ├── analyst_agent.py       # Primary analyst (DeepSeek V3)
│   ├── analyst_alt_llama.py   # Llama 3 analyst
│   ├── analyst_alt_qwen.py    # Qwen analyst
│   ├── executor_agent.py      # DEX-aggregated execution
│   ├── guard_agent.py         # Risk + slashing
│   ├── allocator_agent.py     # Multi-tier allocation
│   └── circuit_breaker_agent.py # System health monitor
├── core/                      # Shared infrastructure
│   ├── chain.py               # Web3/Mantle connection
│   ├── llm.py                 # DeepSeek API wrapper
│   ├── llm_hasher.py          # Reasoning hash chain
│   ├── dex_adapter.py         # DEX aggregation routing
│   ├── pyth_client.py         # Pyth oracle client
│   ├── mev_protection.py      # MEV protection
│   ├── signal_bus.py          # SignalBoard interface
│   ├── identity.py            # Identity registry interface
│   └── strategies/            # RWA, mETH strategy logic
├── skills/                    # Byreal Skills CLI (M01)
│   ├── src/                   # TypeScript CLI source
│   ├── SKILL.md               # Byreal standard doc
│   └── package.json
├── tg-bot/                    # Telegram bot (M05)
│   ├── src/                   # Bot, handlers, services, events
│   └── package.json
├── subgraph/                  # The Graph subgraph (M15)
│   ├── schema.graphql
│   ├── subgraph.yaml
│   └── src/                   # AssemblyScript mappings
├── scripts/                   # Deployment & migration
│   ├── deploy_v2_testnet.js
│   ├── deploy_v2_mainnet.js
│   └── migrate_v1_to_v2.js
├── test/                      # Hardhat tests
├── orchestrator.py            # Main entry point
├── config.py                  # Configuration
└── hardhat.config.js          # Hardhat config (Solidity 0.8.27, Cancun, viaIR)
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
cd tg-bot && npm install && npm run build && cd ..
```

### Configuration

```bash
cp .env.example .env
# Fill in:
#   - OWNER_PRIVATE_KEY (deployer wallet)
#   - ANALYST_PRIVATE_KEY, EXECUTOR_PRIVATE_KEY, GUARD_PRIVATE_KEY, ALLOCATOR_PRIVATE_KEY
#   - DEEPSEEK_API_KEY, TOGETHER_API_KEY, DASHSCOPE_API_KEY
#   - TELEGRAM_BOT_TOKEN, PRIVY_APP_ID, PRIVY_APP_SECRET
#   - ONEINCH_API_KEY
#   - PYTH_ENDPOINT
```

### Compile & Test Contracts

```bash
npx hardhat compile
npx hardhat test
REPORT_GAS=true npx hardhat test
```

### Deploy V2 to Testnet

```bash
npx hardhat run scripts/deploy_v2_testnet.js --network mantle_sepolia
```

### Start Agents

```bash
python orchestrator.py
```

### Run Telegram Bot

```bash
cd tg-bot && npm start
```

### Use Skills CLI

```bash
cd skills
node dist/cli.js vault stats -o json
node dist/cli.js signal list --pending -o json
node dist/cli.js agent list -o json
```

---

## Risk Management

The Guard Agent enforces 9 deterministic risk checks:

1. **Protocol Whitelist** — target must be whitelisted
2. **Selector Whitelist** — function selector must be approved
3. **Amount Limit** — max 10% of vault TVL per operation
4. **Slippage Check** — max 3% slippage tolerance
5. **Confidence Threshold** — signal must have >= 70% confidence
6. **Liquidity Check** — pool must have >= $50k TVL
7. **Oracle Deviation** — price within 5% of Pyth TWAP
8. **Daily PnL** — vault not in drawdown beyond threshold
9. **Circuit Breaker** — system must not be paused

Failed checks trigger slashing of the responsible agent's stake.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Chain** | Mantle (chainId 5000/5003) |
| **Contracts** | Solidity ^0.8.27, OpenZeppelin v5, Hardhat (Cancun + viaIR) |
| **Agents** | Python 3.11, web3.py, APScheduler |
| **LLM** | DeepSeek V3 + Llama 3 + Qwen (multi-model consensus) |
| **Oracles** | Pyth Network (TWAP + anomaly) |
| **DEX** | 1inch API + Merchant Moe + Agni Finance |
| **Standards** | ERC-4626, ERC-8004 (three registries) |
| **CLI** | Byreal Skills standard (TypeScript) |
| **Bot** | Telegraf + Privy embedded wallets |
| **Indexing** | The Graph (subgraph) |

---

## Security

- **Circuit Breaker**: Auto-pauses all operations on -10% daily PnL
- **48h Timelock**: All governance actions delayed for review
- **Agent Slashing**: Malicious/incompetent agents lose staked tokens
- **Insurance Pool**: Covers user losses from agent failures
- **MEV Protection**: Private mempool + commit-reveal for large trades
- **Multi-model Consensus**: No single LLM point of failure

---

## License

MIT — see [LICENSE](LICENSE)
