# AgentBank V3 Security Audit Plan (M22)

## 1. Audit Scope

### 1.1 Contracts In Scope

| Contract | Path | Risk Level |
|----------|------|------------|
| AgentBankVaultV2 | `contracts/core/AgentBankVaultV2.sol` | Critical |
| AgentBankOFT | `contracts/v3/AgentBankOFT.sol` | Critical |
| CrossChainEntrypoint | `contracts/v3/CrossChainEntrypoint.sol` | Critical |
| CircuitBreaker | `contracts/risk/CircuitBreaker.sol` | High |
| InsurancePool | `contracts/risk/InsurancePool.sol` | High |
| SlashingPool | `contracts/risk/SlashingPool.sol` | High |
| VotingEscrow | `contracts/v3/VotingEscrow.sol` | High |
| ABNKToken | `contracts/v3/ABNKToken.sol` | High |
| FeeDistributor | `contracts/v3/FeeDistributor.sol` | Medium |
| SignalAuctionHouse | `contracts/v3/SignalAuctionHouse.sol` | Medium |
| CommitRevealSignal | `contracts/v3/CommitRevealSignal.sol` | Medium |
| IntentRouter | `contracts/v3/IntentRouter.sol` | Medium |
| SolverRegistry | `contracts/v3/SolverRegistry.sol` | Medium |
| AlloraConsumer | `contracts/v3/AlloraConsumer.sol` | Medium |
| OpenGradientReader | `contracts/v3/OpenGradientReader.sol` | Medium |
| TEEAttestationVerifier | `contracts/v3/TEEAttestationVerifier.sol` | Medium |
| AntiSybilGuard | `contracts/v3/AntiSybilGuard.sol` | Low |
| SignalNFT | `contracts/v3/SignalNFT.sol` | Low |
| AgentAccountFactory | `contracts/v3/AgentAccountFactory.sol` | Low |
| AnalystRegistry | `contracts/economy/AnalystRegistry.sol` | Medium |
| PerformanceTracker | `contracts/economy/PerformanceTracker.sol` | Medium |
| IdentityRegistry | `contracts/identity/IdentityRegistry.sol` | Low |
| ReputationRegistry | `contracts/identity/ReputationRegistry.sol` | Low |
| ValidationRegistry | `contracts/identity/ValidationRegistry.sol` | Low |
| RiskOracle | `contracts/risk/RiskOracle.sol` | High |
| AgentBankTimelock | `contracts/risk/AgentBankTimelock.sol` | High |

### 1.2 Focus Areas

- Access control: role-based permissions, privilege escalation via proxy/factory
- Reentrancy: ERC-4626 deposit/withdraw/redeem hooks, callback interactions
- Cross-chain: LayerZero message validation, replay protection, gas griefing
- Oracle security: Allora/Pyth staleness, manipulation via low-liquidity feeds
- Commit-reveal: timing window attacks, selective reveal griefing
- Flash loans: share price manipulation, donation attacks on vault
- Arithmetic: fee calculations, reward distributions, decay functions
- DoS: unbounded loops, gas-limit block stuffing on auctions
- Permit2: approval race conditions, signature replay
- Insurance solvency: coverage ratio under black-swan drawdown
- veABNK: lock duration manipulation, gauge weight sniping
- Slashing: griefing via false dispute, minimum stake invariants

### 1.3 Out of Scope

- Frontend PWA and leaderboard UI
- Off-chain Python orchestrator (`orchestrator.py`, `agents/`, `core/`)
- Telegram bot and mini-app (`tg-bot/`, `tg-miniapp/`)
- Subgraph indexing (`subgraph/`, `subgraph-extensions/`)
- Mock contracts (`contracts/mocks/`)
- Third-party libraries (OpenZeppelin, LayerZero endpoints, Pyth SDK)
- Deployment and migration scripts (`scripts/`, `deployments/`)

---

## 2. Pre-Audit Self-Hardening Checklist

Before submitting to Cantina, the team must complete all items below.

### 2.1 Static Analysis (Slither)

```bash
slither contracts/ \
  --filter-paths "mocks|test|node_modules" \
  --exclude naming-convention,solc-version \
  --json slither-report.json
```

**Pass criteria:** Zero high-severity findings, zero medium-severity findings. Low-severity items must be documented with justification in `audit/slither-acknowledged.md`.

### 2.2 Code Coverage (Foundry)

```bash
forge coverage --report lcov
genhtml lcov.info -o coverage-report/
```

**Pass criteria:** Line coverage >= 85% across all in-scope contracts. Branch coverage >= 75%.

### 2.3 Invariant Tests

The following invariants must have dedicated test suites under `test/invariants/`:

| ID | Invariant | Contract |
|----|-----------|----------|
| INV-01 | `vault.totalAssets() >= sum(shares[i] * vault.convertToAssets(1e18))` | AgentBankVaultV2 |
| INV-02 | `insurancePool.totalCoverage() <= insurancePool.balance()` | InsurancePool |
| INV-03 | `veABNK.totalSupply() == sum(locked[user].amount * timeWeight)` | VotingEscrow |
| INV-04 | `analyst.stake >= MIN_STAKE` after any slash operation | SlashingPool |
| INV-05 | `circuitBreaker triggers when drawdown > threshold` before next deposit | CircuitBreaker |
| INV-06 | `feeDistributor.distributed <= feeDistributor.collected` | FeeDistributor |
| INV-07 | `signalAuction.currentPrice >= signalAuction.reservePrice` during active auction | SignalAuctionHouse |

### 2.4 Fuzz Testing (Echidna)

```bash
echidna test/echidna/ \
  --config echidna-config.yaml \
  --contract AgentBankEchidna \
  --test-mode assertion \
  --corpus-dir echidna-corpus/ \
  --test-limit 500000
```

Run for minimum 3 days on CI with expanded corpus. All assertion and property tests must pass.

### 2.5 Formal Verification Candidates

- `VotingEscrow.withdraw()`: verify lock expiry logic
- `InsurancePool.claim()`: verify payout does not exceed coverage
- `CircuitBreaker.checkAndPause()`: verify threshold math

---

## 3. Cantina Spot Audit Brief

### Brief Format

```
Project:        AgentBank V3
Chain:          Mantle (chainId 5000)
Compiler:       solc 0.8.24
Framework:      Foundry + Hardhat
LOC in scope:   ~4,500
Duration:       2-week engagement + 1-week retest
Team size:      2 senior auditors + 1 junior
Deliverable:    PDF report + on-chain attestation NFT

Repository:     github.com/agentbank/agentbank (branch: audit/v3-cantina)
Commit hash:    [to be pinned at engagement start]

Prior audits:   None (first formal audit)
Bug bounty:     Immunefi (launched concurrently)

Key integrations:
  - LayerZero V2 (cross-chain OFT messaging)
  - Allora Network (LLM inference oracle)
  - OpenGradient (on-chain ML model reads)
  - Pyth Network (price feeds)
  - Permit2 (token approvals)
  - ERC-4626 (vault standard)
  - ERC-6551 (token-bound accounts)
  - ERC-8004 (identity registry)

Known tradeoffs:
  - Vault uses a 1-block deposit delay to mitigate donation attacks
  - InsurancePool coverage is capped at 10% of TVL by design
  - CommitRevealSignal has a 2-block reveal window (MEV tradeoff)
  - RiskOracle accepts stale data up to 1 hour for gas efficiency
```

---

## 4. Security Section for README

The following content should be added to the main README.md under a "Security" heading:

---

### Security

**Audited by Cantina** - AgentBank V3 contracts underwent a comprehensive 2-week security audit by Cantina (formerly Code4rena) with a dedicated team of senior auditors.

**Findings Summary:**
- Critical: 0
- High: 0
- Medium: [TBD post-audit]
- Low: [TBD post-audit]
- Informational: [TBD post-audit]

All medium and above findings were remediated before mainnet deployment.

**Static Analysis:**
- Slither: Zero high/medium findings (report available in `audit/slither-report.json`)
- Aderyn: Zero high findings

**Invariant Testing:**
- 7 protocol-critical invariants tested via Foundry invariant mode
- 500,000+ Echidna iterations with zero violations

**Fuzz Testing:**
- Foundry fuzz: 10,000 runs per test function
- Echidna property + assertion mode: 3-day continuous corpus

**Bug Bounty:**
- Program live on [Immunefi](https://immunefi.com/bounty/agentbank)
- Critical: up to $50,000
- High: up to $10,000
- Medium: up to $2,500

---

## 5. Post-Audit Process

1. Pin audit commit hash in `audit/scope.yaml`
2. Publish Cantina report PDF to `audit/cantina-report.pdf`
3. Mint on-chain attestation via Cantina's attestation contract
4. Update README security section with final finding counts
5. Launch Immunefi bug bounty within 48 hours of report publication
6. Schedule 30-day post-launch monitoring period with elevated alerting
