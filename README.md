# AgentBank

> Four AI agents autonomously managing an on-chain treasury on Mantle.
> Every decision is recorded on-chain. No human intervention required.

**Mantle Turing Test Hackathon 2026 | Agentic Wallets & Economy Track**

[![Deployed on Mantle](https://img.shields.io/badge/Deployed-Mantle%20Mainnet-00D395)](https://explorer.mantle.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What is AgentBank?

AgentBank is the first multi-agent autonomous treasury on Mantle. Users deposit USDC and four specialized AI agents — Analyst, Executor, Guard, and Allocator — collaboratively manage the funds, executing DeFi strategies across Merchant Moe, Agni Finance, and Fluxion.

**Key properties:**

- Fully autonomous — no human intervention after deposit
- Every agent decision is permanently recorded on Mantle
- Agent manages agent — Guard Agent vetos Executor before every tx
- Each agent has a unique ERC-8004 identity with on-chain reputation

---

## The Four Agents

| Agent | Role | Schedule |
|---|---|---|
| **Analyst** | Analyzes DeFi pools via DeepSeek V3, generates strategy signals | Every 60 min |
| **Executor** | Executes approved strategies on-chain via vault | Every 15 min |
| **Guard** | Pre-flight risk check (7 checks) before every tx | Real-time |
| **Allocator** | Distributes accumulated yield to depositors | Every 24h |

---

## Architecture

```
User deposits USDC -> AgentBankVault (ERC-4626)
                              |
                       SignalBoard (on-chain)
                      /              \
               Analyst             Executor
             (posts signal)      (reads signal)
                                      |
                                  Guard Agent
                               (approve / block)
                                      |
                              executeOperation()
                                      |
                              Allocator Agent
                           (distribute yield 24h)
```

### Agent Communication

Agents communicate exclusively through the on-chain **SignalBoard** contract — no APIs, no message queues. This ensures:
- Full transparency and auditability
- Every signal, decision, and action has a tx hash
- Anyone can verify agent behavior on MantleScan

### ERC-8004 Identity System

Each agent holds a unique NFT (ERC-8004) with:
- Reputation score updated after every action
- `+10` for successful operations
- `+5` for blocked risky transactions (Guard)
- `-20` for failed operations

---

## Smart Contracts

| Contract | Description | Standard |
|---|---|---|
| **AgentBankVault** | ERC-4626 vault with role-based agent access | ERC-4626 + AccessControl |
| **SignalBoard** | On-chain message bus for agent-to-agent communication | Custom |
| **AgentIdentity** | Agent identity NFT with reputation scoring | ERC-721 (ERC-8004 pattern) |

### Contract Addresses (Mantle Sepolia Testnet)

| Contract | Address |
|---|---|
| AgentBankVault | *Deploy with `npm run deploy:testnet`* |
| SignalBoard | *Deploy with `npm run deploy:testnet`* |
| AgentIdentity | *Deploy with `npm run deploy:testnet`* |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Git

### Installation

```bash
git clone https://github.com/yourusername/agentbank
cd agentbank

# Install Solidity/Hardhat dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

### Configuration

```bash
cp .env.example .env
# Fill in:
#   - OWNER_PRIVATE_KEY (deployer wallet)
#   - ANALYST_PRIVATE_KEY, EXECUTOR_PRIVATE_KEY, GUARD_PRIVATE_KEY, ALLOCATOR_PRIVATE_KEY
#   - DEEPSEEK_API_KEY
```

### Compile & Test Contracts

```bash
# Compile all contracts
npx hardhat compile

# Run all tests
npx hardhat test

# Run with gas report
REPORT_GAS=true npx hardhat test
```

### Deploy to Testnet

```bash
# Fund wallets with Mantle Sepolia MNT from faucet
# https://faucet.sepolia.mantle.xyz

# Deploy contracts
npm run deploy:testnet

# Copy printed addresses to .env
```

### Start Agents

```bash
python orchestrator.py
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Chain** | Mantle (EVM-compatible, chainId 5000/5003) |
| **Contracts** | Solidity ^0.8.20, OpenZeppelin v5, Hardhat |
| **Agents** | Python 3.11, web3.py, APScheduler |
| **LLM** | DeepSeek V3 (analysis + risk judgment) |
| **Standards** | ERC-4626 (vault), ERC-8004 (agent identity) |
| **Protocols** | Merchant Moe, Agni Finance, Fluxion |

---

## Project Structure

```
agentbank/
├── contracts/              # Solidity smart contracts
│   ├── AgentBankVault.sol  # ERC-4626 vault
│   ├── AgentIdentity.sol   # ERC-8004 identity NFT
│   ├── SignalBoard.sol     # On-chain signal bus
│   ├── interfaces/         # Contract interfaces
│   └── mocks/              # Test mocks
├── scripts/                # Deployment scripts
├── test/                   # Hardhat tests
├── agents/                 # Python agent implementations
│   ├── base_agent.py       # Abstract base class
│   ├── analyst_agent.py    # Strategy analysis
│   ├── executor_agent.py   # Trade execution
│   ├── guard_agent.py      # Risk checking
│   └── allocator_agent.py  # Yield distribution
├── skills/                 # Agent skill modules
│   ├── pool_analysis.py    # DeFi pool data fetching
│   ├── swap_execution.py   # Transaction building
│   ├── risk_check.py       # Deterministic risk checks
│   └── yield_calc.py       # Yield calculation
├── core/                   # Shared infrastructure
│   ├── chain.py            # Web3/Mantle connection
│   ├── llm.py              # DeepSeek API wrapper
│   ├── signal_bus.py       # SignalBoard interface
│   └── identity.py         # ERC-8004 reputation
├── orchestrator.py         # Main entry point
├── config.py               # Configuration
└── hardhat.config.js       # Hardhat configuration
```

---

## Risk Management

The Guard Agent enforces 7 deterministic risk checks before every transaction:

1. **Protocol Whitelist** — target must be in [merchant_moe, agni_finance, fluxion]
2. **Amount Limit** — max 10% of vault TVL per operation
3. **Slippage Check** — max 3% slippage tolerance
4. **Confidence Threshold** — signal must have >= 70% confidence
5. **Liquidity Check** — pool must have >= $50k TVL
6. **Oracle Deviation** — price must be within 5% of TWAP
7. **Vault Status** — vault must not be paused

If any check fails, the operation is blocked and logged on-chain.

---

## Why Mantle?

- **Low gas costs** enable frequent agent decisions economically (every 15 min)
- **ERC-8004** native support for agent identity
- **Rich DeFi ecosystem** — Merchant Moe, Agni Finance, Fluxion provide sufficient liquidity
- **EVM-compatible** — standard tooling (Hardhat, web3.py) works out of the box

---

## Development

### Running Tests

```bash
# Solidity tests
npx hardhat test

# Single test file
npx hardhat test test/AgentBankVault.test.js
```

### Deploy to Mainnet

```bash
# Update .env: NETWORK_NAME=mantle
# Fund wallets with real MNT

npm run deploy:mainnet

# Verify contracts
npx hardhat run scripts/verify_contracts.js --network mantle
```

---

## License

MIT — see [LICENSE](LICENSE)
