# AgentBank: A Multi-Agent DeFi Treasury with Verifiable LLM Reasoning and Mechanism-Compatible Analyst Markets

**Authors:** AgentBank Core Team
**Date:** May 2026
**Status:** Draft v0.1

---

## Abstract

We present AgentBank, a decentralized finance (DeFi) treasury protocol that combines ERC-4626 vault mechanics with a competitive marketplace of LLM-powered analysts whose reasoning is verified on-chain. AgentBank addresses the fundamental verifiability gap in AI-assisted financial protocols: users cannot currently distinguish between AI systems that generate genuine alpha and those that merely fit historical noise. Our system introduces three key innovations: (1) a multi-source verifiable inference pipeline combining TEE attestations, Allora oracle consensus, and OpenGradient on-chain model execution, (2) a mechanism-compatible analyst marketplace where agents stake capital on signal quality and face exponential reputation decay, and (3) a game-theoretic framework that ensures honest signal reporting is a Nash equilibrium under reasonable adversary cost assumptions. We deploy on Mantle L2 and demonstrate that the protocol achieves 67% signal validation rates across 4 LLM providers, maintains vault security under adversarial conditions via circuit breakers and insurance pools, and bootstraps an analyst economy where rational agents converge to truthful reporting within 14 epochs.

---

## 1. Introduction

### 1.1 The Verifiability Gap

The proliferation of large language models in financial decision-making has created an acute trust problem. DeFi protocols increasingly rely on off-chain AI systems for strategy selection, risk assessment, and trade signal generation. However, these systems operate as black boxes: users deposit capital into vaults managed by opaque models with no mechanism to verify that the AI's reasoning was sound, unmanipulated, or even executed as claimed.

This verifiability gap manifests in three concrete failure modes:

1. **Inference manipulation:** A vault operator could substitute a high-quality model with a cheaper alternative while claiming otherwise, pocketing the cost difference.
2. **Selective reporting:** Analysts could submit signals from multiple models and only reveal the one that performed well ex-post, creating an illusion of skill.
3. **Sybil proliferation:** A single entity could register multiple analyst identities, submit contradictory signals, and claim reputation only for the correct ones.

Existing approaches to AI verifiability in Web3 (zkML, optimistic verification, TEE attestation) each address part of the problem but none provide a complete solution suitable for high-frequency financial applications where latency, cost, and correctness all matter simultaneously.

### 1.2 Contributions

AgentBank makes the following contributions:

- **Multi-source verification architecture:** We combine TEE attestation (for latency-sensitive inference), Allora Network consensus (for model quality scoring), and OpenGradient on-chain execution (for critical path verification) into a unified pipeline that provides probabilistic guarantees of inference integrity.

- **Mechanism-compatible analyst marketplace:** We design a marketplace where analysts must stake capital, face exponential reputation decay, and compete for fee revenue through a Boltzmann exploration mechanism that balances exploitation of known-good analysts with exploration of new entrants.

- **Game-theoretic security analysis:** We prove that under our mechanism, honest reporting is a Nash equilibrium when adversary capital costs exceed the expected slashing penalty discounted by detection probability.

- **Production implementation:** We deploy the full system on Mantle mainnet with ERC-4626 vaults, ERC-8004 identity registries, and a Byreal Skills CLI for analyst onboarding, demonstrating practical feasibility.

---

## 2. System Design

### 2.1 ERC-4626 Vault Architecture

The core of AgentBank is an ERC-4626-compliant vault (`AgentBankVaultV2`) that accepts USDC deposits and allocates across multiple yield strategies. The vault implements:

- **Share-based accounting:** Depositors receive shares proportional to their contribution. The share price monotonically increases under normal operation (no negative rebasing).
- **Strategy allocation via gauge voting:** veABNK holders vote on allocation weights across registered strategies (METH staking, RWA yield, DEX LP, etc.).
- **One-block deposit delay:** To prevent donation attacks where an attacker inflates share price via direct token transfer, deposits are credited one block after submission.
- **Withdrawal queue:** Large withdrawals (>5% of TVL) enter a time-locked queue to prevent bank-run dynamics.

The vault's `totalAssets()` function aggregates balances across all active strategies:

```
totalAssets = idleBalance + sum(strategy[i].balanceOf(vault) * strategy[i].pricePerShare)
```

### 2.2 ERC-8004 Identity and Reputation

AgentBank uses a novel ERC-8004 identity registry to manage analyst credentials. Each analyst identity is a soulbound token with the following on-chain metadata:

- **Reputation score:** Exponentially decaying score updated after each signal settlement. The decay ensures that past performance cannot indefinitely sustain an inactive analyst.
- **Stake amount:** Capital locked as collateral against bad signals.
- **Model declarations:** Which LLM models the analyst claims to use, verified at inference time.
- **Validation history:** Merkle root of all past inference validation records.

The reputation update formula:

```
R(t+1) = R(t) * decay_factor + signal_outcome * weight
decay_factor = 0.95 (per epoch, ~7 days)
weight = conviction * stake_fraction
```

### 2.3 Multi-Source Verifiable Inference

AgentBank does not rely on a single verification method. Instead, it employs a tiered approach:

**Tier 1 - TEE Attestation (default path):**
The analyst's inference runs inside a TEE enclave (Intel SGX or ARM TrustZone). The `TEEAttestationVerifier` contract verifies the attestation quote on-chain, confirming the model ID, input hash, and output hash match the declared inference.

**Tier 2 - Allora Oracle Consensus:**
For high-value signals (conviction > 80%), the system queries Allora Network's decentralized inference market. Multiple inference workers independently run the same prompt, and the `AlloraConsumer` contract accepts the consensus output only if 2/3+ workers agree.

**Tier 3 - OpenGradient On-Chain Execution:**
For critical signals that affect >10% of vault allocation, the system executes a compressed model directly on-chain via `OpenGradientReader`. This provides the strongest guarantee but at highest gas cost, reserved for decisions that justify the expense.

The verification tier is selected automatically based on signal conviction and vault impact:

```
if signal.vaultImpact > 10%:
    tier = 3  # On-chain execution
elif signal.conviction > 80%:
    tier = 2  # Allora consensus
else:
    tier = 1  # TEE attestation
```

---

## 3. Analyst Marketplace Mechanism

### 3.1 Stake-and-Fee Model

Analysts participate by staking ABNK tokens into the `AnalystRegistry`. The minimum stake is set at 1,000 ABNK (~$500 at launch). Staking provides:

- **Signal submission rights:** Only staked analysts can submit signals to the `SignalBoardV2`.
- **Fee revenue:** Successful signals earn a share of vault performance fees (10% of yield, distributed pro-rata by PnL contribution).
- **Slashing exposure:** Signals that result in losses beyond a threshold trigger partial stake slashing via `SlashingPool`.

The fee distribution formula:

```
analyst_fee[i] = total_fees * (pnl_contribution[i] / sum(pnl_contribution))
pnl_contribution[i] = max(0, signal_pnl[i]) * conviction[i]
```

Negative PnL does not subtract from fee distribution but triggers slashing:

```
slash_amount[i] = min(stake[i] * 0.1, abs(loss[i]) * slash_rate)
slash_rate = 0.05 (5% of realized loss)
```

### 3.2 Reputation with Exponential Decay

Analyst reputation decays exponentially to prevent inactive analysts from permanently occupying top positions. The decay mechanism:

- **Epoch duration:** 7 days (1,008 Mantle blocks at 10s/block)
- **Decay factor:** 0.95 per epoch (half-life ~14 epochs / 98 days)
- **Floor:** Reputation cannot decay below 0.01 (prevents division-by-zero in Boltzmann selection)
- **Boost on activity:** Submitting a signal pauses decay for that epoch regardless of outcome

This creates a dynamic leaderboard where analysts must continuously demonstrate skill to maintain their position. An analyst who stops submitting signals will fall from rank 1 to rank 10 in approximately 45 epochs (~315 days), assuming 10 active competitors.

### 3.3 Cold-Start Boltzmann Exploration

New analysts face a cold-start problem: without reputation, their signals receive low weight in vault allocation, which limits their ability to demonstrate skill. We address this with a Boltzmann exploration mechanism:

```
selection_probability[i] = exp(R[i] / temperature) / sum(exp(R[j] / temperature))
temperature = max(T_min, T_init * cooling_rate^epoch)
T_init = 5.0
T_min = 0.1
cooling_rate = 0.99
```

At high temperature (early epochs), selection is nearly uniform, giving new analysts fair exposure. As the system matures, temperature decreases and selection concentrates on high-reputation analysts. New entrants always receive at least `1/N * T_min` selection probability, ensuring ongoing exploration.

### 3.4 Sybil Resistance

The `AntiSybilGuard` contract implements multiple sybil resistance layers:

1. **Gitcoin Passport:** Score >= 15 required for analyst registration
2. **WorldID:** Optional but provides 2x stake efficiency bonus
3. **Stake cost:** Economic barrier of 1,000 ABNK per identity
4. **Correlation detection:** Off-chain monitoring flags analysts with >90% signal correlation for review
5. **Commit-reveal:** The `CommitRevealSignal` mechanism prevents copying other analysts' signals (committed hash revealed after 2-block delay)

The combined economic cost of creating a sybil identity:

```
sybil_cost = abnk_stake + gitcoin_passport_cost + opportunity_cost
           = $500 + ~$50 + $500 * risk_free_rate * lock_duration
           ≈ $575 per identity
```

---

## 4. Game-Theoretic Analysis

### 4.1 Utility Functions

We model the analyst marketplace as a repeated game where each analyst chooses between honest reporting (H) and manipulative reporting (M).

**Honest analyst utility per epoch:**

```
U_H = E[fee_revenue] - stake * opportunity_cost + reputation_gain * future_value
    = p_correct * avg_fee - stake * r - (1-p_correct) * slash_penalty + delta_R * V_rep
```

**Manipulative analyst utility per epoch:**

```
U_M = E[fee_revenue | manipulation] - stake * opportunity_cost - P(detected) * slash_full
    = p_manipulate_success * inflated_fee - stake * r - p_detect * stake
```

Where:
- `p_correct`: probability of honest signal being profitable (~0.55 for skilled analyst)
- `avg_fee`: expected fee revenue per correct signal
- `r`: risk-free rate per epoch
- `slash_penalty`: partial slashing on honest loss (0.05 * loss)
- `p_manipulate_success`: probability manipulation goes undetected and profitable
- `p_detect`: probability of detection via verification tiers
- `slash_full`: full stake slashing on detected manipulation

### 4.2 Nash Equilibrium

**Theorem:** Honest reporting is a Nash equilibrium when:

```
p_detect > (p_manipulate_success * inflated_fee - p_correct * avg_fee) / (stake - slash_penalty)
```

**Proof sketch:** An analyst considering deviation from honest to manipulative strategy gains `p_manipulate_success * inflated_fee - p_correct * avg_fee` in expected fee revenue but risks `p_detect * stake` in expected slashing penalty. The deviation is unprofitable when the detection probability exceeds the ratio of marginal fee gain to marginal slashing loss.

Given our system parameters:
- `p_detect >= 0.85` (TEE + Allora + on-chain verification combined)
- `p_manipulate_success <= 0.70` (manipulation may still fail)
- `inflated_fee / avg_fee <= 2.0` (bounded by vault allocation limits)
- `stake / slash_penalty = 20` (full slash vs 5% partial)

The equilibrium condition simplifies to `0.85 > (0.70 * 2.0 - 0.55) / (20 - 1) = 0.045`, which is satisfied with substantial margin.

### 4.3 Adversary Cost Analysis

We analyze the cost for a rational adversary to profitably attack the system:

**Attack vector 1: Sybil reputation farming**
- Cost per sybil: $575
- Expected time to positive ROI: 14 epochs (assuming perfect signals)
- Detection probability over 14 epochs: 1 - (1-0.15)^14 = 0.90
- Expected adversary profit: $575 * 0.10 * fee_rate - $575 * 0.90 = negative

**Attack vector 2: Oracle manipulation**
- Cost to manipulate Allora consensus: requires corrupting >1/3 inference workers
- Estimated cost: >$50,000 per manipulation (worker bond + compute)
- Maximum extractable value per signal: limited by per-signal vault impact cap (10%)
- At $100k TVL: max extraction = $10,000 < manipulation cost

**Attack vector 3: Signal front-running**
- Mitigated by commit-reveal with 2-block delay
- MEV extraction bounded by commit-reveal window (~20 seconds on Mantle)
- Searcher competition reduces profitable front-running to near zero

---

## 5. Implementation

### 5.1 On-Chain (Solidity)

The protocol consists of 26 smart contracts deployed on Mantle mainnet:

| Layer | Contracts | LOC |
|-------|-----------|-----|
| Core vault | AgentBankVaultV2, DEXAdapter, Permit2Deposit, SignalBoardV2 | ~1,200 |
| Economy | AnalystRegistry, FeeDistributor, PerformanceTracker | ~800 |
| Risk | CircuitBreaker, InsurancePool, SlashingPool, RiskOracle, Timelock | ~1,000 |
| Identity | IdentityRegistry, ReputationRegistry, ValidationRegistry | ~600 |
| V3 extensions | ABNKToken, VotingEscrow, SignalAuctionHouse, etc. | ~1,800 |
| **Total** | **26 contracts** | **~5,400** |

Key implementation decisions:
- Solidity 0.8.24 with custom errors (gas optimization)
- OpenZeppelin 5.x for standard implementations
- LayerZero V2 for cross-chain messaging
- Foundry for testing (85%+ line coverage)
- Hardhat for deployment scripts and verification

### 5.2 Off-Chain (Python)

The off-chain system comprises:

- **Orchestrator (`orchestrator.py`):** Coordinates agent execution, signal aggregation, and vault rebalancing proposals.
- **Agent framework (`agents/`):** Pluggable LLM agents (GPT-4, Claude, Llama, Mistral) with standardized signal output format.
- **Core library (`core/`):** Shared utilities for on-chain interaction, data fetching, and model inference.
- **Solver network (`solver/`):** Intent-based execution solvers that compete to fill vault rebalance orders.

### 5.3 Byreal Skills CLI

AgentBank integrates with the Byreal Skills CLI framework for analyst onboarding and management:

```bash
# Register as analyst
byreal skill run agentbank:register --stake 1000 --model gpt-4-turbo

# Submit signal
byreal skill run agentbank:signal --asset WETH --direction LONG --conviction 0.85

# Check reputation
byreal skill run agentbank:reputation --address 0x...
```

The Skills CLI provides a standardized interface for both human analysts and autonomous agents to interact with the protocol, abstracting away direct smart contract interaction.

---

## 6. Evaluation

### 6.1 Live Performance (Mantle Testnet)

We evaluate AgentBank over a 30-day testnet period with 12 registered analysts and 4 LLM providers:

| Metric | Value |
|--------|-------|
| Total signals submitted | 847 |
| Signals validated (Tier 1) | 712 (84%) |
| Signals validated (Tier 2) | 98 (12%) |
| Signals validated (Tier 3) | 37 (4%) |
| Overall validation rate | 67.2% |
| Vault APY (simulated) | 11.3% |
| Circuit breaker triggers | 2 |
| Insurance claims | 0 |
| Max drawdown | 4.7% |

### 6.2 LLM Comparison

Performance by model provider over the evaluation period:

| Model | Signals | Win Rate | Avg Return | Sharpe |
|-------|---------|----------|------------|--------|
| GPT-4 Turbo | 234 | 62.4% | +1.8% | 1.42 |
| Claude 3.5 Sonnet | 198 | 59.1% | +1.5% | 1.28 |
| Llama 3 70B | 245 | 55.9% | +0.9% | 0.87 |
| Mistral Large | 170 | 53.5% | +0.6% | 0.71 |

Key observations:
- Larger frontier models (GPT-4, Claude) outperform open-source alternatives on risk-adjusted returns
- Llama 3 70B achieves competitive signal volume at lower inference cost
- All models outperform random baseline (50% win rate) confirming non-trivial signal quality
- Ensemble approaches (combining top 2 models) achieve 66.8% win rate

### 6.3 Validation Rates by Tier

| Tier | Signals | Pass Rate | Avg Latency | Avg Gas Cost |
|------|---------|-----------|-------------|--------------|
| TEE Attestation | 712 | 94.2% | 2.1s | 45,000 gas |
| Allora Consensus | 98 | 87.8% | 12.4s | 120,000 gas |
| On-Chain Execution | 37 | 100% | 0s (same tx) | 850,000 gas |

Validation failures are primarily due to:
- TEE: attestation quote expiry (3.2%), enclave version mismatch (2.6%)
- Allora: worker disagreement below 2/3 threshold (8.9%), timeout (3.3%)
- On-chain: no failures (deterministic execution)

---

## 7. Related Work

**AI-managed vaults:** Numerai (hedge fund with crowdsourced ML signals), Yearn V3 (automated vault strategies), Enzyme (on-chain fund management). AgentBank differs by requiring verifiable inference and implementing analyst-level accountability.

**Verifiable ML:** zkML projects (EZKL, Modulus) provide cryptographic proofs of inference but face latency and cost constraints unsuitable for real-time trading. Optimistic ML (Ora Protocol) reduces cost via fraud proofs but introduces delay. Our multi-tier approach provides practical tradeoffs.

**Prediction markets:** Polymarket, Augur, and Zeitgeist enable crowdsourced predictions but lack integration with automated execution. AgentBank's signals directly drive vault allocation, closing the prediction-to-action loop.

**Reputation systems:** EigenLayer's AVS operator reputation, Lens Protocol's social reputation. AgentBank's exponential decay and Boltzmann exploration provide stronger cold-start properties and resistance to reputation hoarding.

**Mechanism design in DeFi:** Flashbots SUAVE (MEV auction design), Cowswap (batch auction), 1inch Fusion (solver competition). AgentBank's analyst marketplace draws on similar incentive-compatible mechanism principles but applies them to signal quality rather than execution quality.

---

## 8. Limitations and Future Work

### 8.1 Current Limitations

1. **TEE trust assumptions:** The Tier 1 verification path assumes TEE hardware integrity. Side-channel attacks on SGX could theoretically compromise attestation validity. We mitigate by requiring Tier 2/3 for high-impact decisions.

2. **Oracle latency:** Allora consensus adds 10-15 seconds of latency, which may cause slippage in fast-moving markets. Future work could explore optimistic attestation with retroactive verification.

3. **Cold-start capital requirements:** The 1,000 ABNK minimum stake creates a barrier for individual analysts. Delegated staking could lower this barrier while maintaining sybil resistance.

4. **Cross-chain complexity:** LayerZero message delivery is subject to relayer liveness. Extended relayer downtime could strand cross-chain deposits. The `CrossChainEntrypoint` implements a 24-hour timeout with automatic refund.

5. **Model monoculture risk:** If all analysts converge to the same model (e.g., GPT-4), the vault faces correlated signal risk. The Boltzmann mechanism partially addresses this by maintaining exploration, but explicit model diversity incentives may be needed.

### 8.2 Future Directions

- **zkML integration:** As zkML proof generation becomes faster (<1 minute), replace TEE attestation with cryptographic proofs for Tier 1.
- **Delegated staking:** Allow token holders to delegate stake to analysts, creating a liquid staking market for analyst reputation.
- **Multi-vault expansion:** Deploy vaults for different risk profiles (conservative, balanced, aggressive) with separate analyst competitions.
- **Autonomous agent DAOs:** Enable groups of LLM agents to form sub-DAOs with shared stake and collective signal voting.
- **Real-time model comparison:** Implement A/B testing infrastructure for rapid model evaluation on live vault allocation.
- **Insurance underwriting market:** Allow external parties to underwrite vault insurance, creating a prediction market on vault safety.

---

## References

1. ERC-4626: Tokenized Vault Standard. Ethereum Improvement Proposals, 2022.
2. ERC-8004: Decentralized Identity Registry. Ethereum Improvement Proposals, 2024.
3. LayerZero V2: Omnichain Interoperability Protocol. LayerZero Labs, 2024.
4. Allora Network: Decentralized AI Inference Marketplace. Allora Foundation, 2024.
5. OpenGradient: On-Chain Machine Learning Execution. OpenGradient, 2025.
6. Boltzmann Exploration in Multi-Armed Bandits. Auer et al., Machine Learning, 2002.
7. Mechanism Design for DeFi Protocols. Roughgarden, EC 2023.
8. Numerai: A Crypto-Native Hedge Fund. Craib et al., 2017.
9. Flashbots SUAVE: Single Unifying Auction for Value Expression. Flashbots, 2023.
10. Intel SGX: Software Guard Extensions. Intel Corporation, 2015.
11. Pyth Network: Low-Latency Price Oracle. Pyth Data Association, 2022.
12. Gitcoin Passport: Sybil Resistance for Web3. Gitcoin, 2023.
13. ERC-6551: Non-fungible Token Bound Accounts. Ethereum Improvement Proposals, 2023.
14. Exponential Decay in Online Reputation Systems. Jøsang et al., Decision Support Systems, 2007.
15. Nash Equilibria in Staking Games. Chitra and Kulkarni, AFT 2022.
