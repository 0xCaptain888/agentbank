# AgentBank V3 Mechanism Design (M28)

## 1. Overview

This document formalizes the mechanism design underpinning AgentBank V3's multi-agent
DeFi protocol. We define agent utility functions, analyze Nash equilibria in the
signal-auction game, characterize adversary models, and provide proof sketches for
incentive compatibility and sybil resistance.

## 2. System Model

### 2.1 Participants

| Role | Action Set | Stake Required |
|------|-----------|----------------|
| Depositor | post intent, cancel intent, withdraw | None (assets at risk) |
| Analyst | register, post signal, stake ABNK | Minimum 1000 ABNK |
| Solver | register, submit bid, execute strategy | Bond per bid |
| Attester | verify TEE runs | Approved key enrollment |
| Governance | parameter updates, code approval | veABNK voting power |

### 2.2 Protocol Parameters

- `AUCTION_DURATION`: 30 minutes (intent auction window)
- `MIN_BOND_BPS`: 500 bps of intent amount (solver bond floor)
- `SLASH_RATE`: 50% of bond on underperformance
- `REPUTATION_DECAY`: 0.95^epochs (weekly decay)
- `MAX_LOCK`: 4 years (veABNK)
- `SYBIL_THRESHOLD`: anti-sybil score >= 50

## 3. Agent Utility Functions

### 3.1 Depositor Utility

A depositor `i` with capital `C_i` and risk tolerance `r_i` has utility:

```
U_depositor(i) = E[APY_realized] * C_i - lambda_i * Var[returns] - gas_cost
```

Where `lambda_i` is the risk aversion coefficient. The intent system allows depositors
to express `(minAPY, maxDrawdown)` constraints, effectively bounding the variance term.

**Constraint mapping:**
- `minApyBps` -> lower bound on E[APY]
- `maxDrawdownBps` -> upper bound on sqrt(Var) proxy

### 3.2 Analyst Utility

An analyst `a` with reputation `R_a` and stake `S_a`:

```
U_analyst(a) = fee_share(R_a) * sum(execution_fees) + reputation_gain(signals) - S_a * slash_prob
```

Where:
- `fee_share(R)` = R / sum(R_all) (proportional to reputation)
- `reputation_gain` = accuracy_weighted_pnl per signal
- `slash_prob` = P(signal accuracy < threshold over window)

### 3.3 Solver Utility

A solver `s` bidding on intent `j`:

```
U_solver(s,j) = execution_fee(j) - bond_opportunity_cost - gas - penalty * I(underperform)
```

Where:
- `execution_fee(j)` = spread between realized APY and promised APY, paid by protocol
- `bond_opportunity_cost` = bond_amount * risk_free_rate * lock_duration
- `penalty` = SLASH_RATE * bond if realized APY < promised APY - tolerance

### 3.4 Attester Utility

Attesters are permissioned (approved keys) and earn no direct fees; their utility is
reputational and tied to the TEE operator's business model:

```
U_attester = reputation_value - hardware_cost - slashing_if_compromised
```

## 4. Nash Equilibrium Analysis

### 4.1 Signal Posting Game

**Players:** N analysts, each choosing signal quality `q_i in [0,1]`.

**Strategy space:** Each analyst chooses effort level `e_i` which maps to signal quality:
`q_i = f(e_i)` where f is concave (diminishing returns on research).

**Payoff:** Proportional reputation allocation:
```
pi_i(q_i, q_{-i}) = q_i / sum(q_j) * TOTAL_FEES - c(e_i)
```

**Theorem 4.1 (Symmetric Nash Equilibrium):**
In the symmetric case where all analysts have identical cost functions `c(e)`,
there exists a unique symmetric NE at:
```
e* such that f'(e*) * (N-1) / (N * f(e*)) = c'(e*) / TOTAL_FEES
```

**Proof sketch:** Take FOC of payoff w.r.t. e_i, impose symmetry q_i = q_j = q*,
solve for the fixed point. Uniqueness follows from strict concavity of f and
strict convexity of c.

### 4.2 Auction Game (Intent Settlement)

**Players:** M solvers bidding on intent with constraints (minAPY, maxDrawdown).

**Strategy:** Each solver submits promised APY `a_s` and bond `b_s`.

**Mechanism:** First-score auction where score = a_s * sqrt(b_s) (higher is better).
Winning solver must deliver >= promised APY or lose bond.

**Theorem 4.2 (Incentive Compatible Bidding):**
Under the scoring rule, truthful bidding (promising the solver's true expected APY)
is a weakly dominant strategy when the bond slash is >= 50% and the solver's APY
estimate has bounded variance.

**Proof sketch:** Overbidding increases win probability but creates expected penalty:
```
E[penalty | overbid by delta] = SLASH_RATE * bond * P(realized < promised)
```
For normally distributed returns, P(shortfall) increases superlinearly with delta.
The marginal cost of overbidding exceeds marginal benefit when SLASH_RATE >= 0.5.

### 4.3 Reputation Dynamics

Reputation evolves as an exponential moving average:

```
R_a(t+1) = DECAY * R_a(t) + (1 - DECAY) * performance_score(t)
```

Where `performance_score(t)` is the accuracy-weighted PnL of signals in epoch t.

**Steady-state:** For a consistently performing analyst with score `s`:
```
R_a(inf) = s * (1 - DECAY) / (1 - DECAY) = s
```

This ensures that reputation converges to true quality and that dormant analysts
lose influence over time.

## 5. Adversary Model

### 5.1 Byzantine Fault Tolerance

**Assumption:** At most f < N/3 of participants in any role are Byzantine (arbitrary
behavior including collusion).

**Threat vectors:**

| Attack | Mitigation | Bound |
|--------|-----------|-------|
| False signals | Stake slashing + reputation decay | Cost > expected gain when stake > 3x max fee |
| Solver collusion | Independent TEE verification + bond | Collusion requires > 1/3 attesters |
| Sybil analysts | AntiSybilGuard (Gitcoin Passport + on-chain history) | Score threshold 50 |
| Griefing intents | Gas cost + minimum deposit size | Spam cost linear in N |
| Oracle manipulation | Commit-reveal scheme (30-block delay) | Front-running eliminated |
| TEE compromise | Dual-TEE (Phala + Marlin), 2-of-2 attestation | Single TEE breach insufficient |

### 5.2 Economic Security Bounds

For the protocol to be secure, the cost of attack must exceed the potential gain:

```
SECURITY_CONDITION: min_stake * slash_rate > max_extractable_value_per_epoch
```

With current parameters:
- min_stake = 1000 ABNK
- slash_rate = 50%
- max_extractable_value (from a single false signal routed to vault) ~ 200 ABNK equivalent

Thus: 1000 * 0.5 = 500 > 200. Security holds with 2.5x margin.

### 5.3 Collusion Resistance

**Theorem 5.1 (Collusion Bound):**
A coalition of k < N/3 analysts cannot profitably manipulate protocol outcomes if:
```
k * stake_per_analyst * SLASH_RATE > k * (fee_share_manipulated - fee_share_honest) * T
```
where T is the detection window (epochs before reputation-based exclusion).

With T = 4 epochs (1 month) and weekly fees of ~50 ABNK per analyst:
```
k * 500 > k * (additional_50_per_week * 4) = k * 200
```
Holds trivially. Coalition has negative expected value.

## 6. Incentive Compatibility Proofs

### 6.1 Truthful Signal Reporting

**Proposition 6.1:** Under the reputation-weighted fee distribution and quadratic
slashing, truthful signal reporting (posting signals aligned with analyst's true
beliefs) is incentive compatible.

**Proof:**
1. Let analyst's true belief be direction d* with confidence c*.
2. Deviating to (d', c') where d' != d* or c' > c*:
   - If d' != d*: Expected reputation change = -c' * P(d* correct) + c' * P(d' correct)
     Since P(d* correct) > 0.5 by assumption (analyst has information), deviation
     has negative expected reputation impact.
   - If c' > c*: Overstating confidence amplifies both gains and losses. With
     quadratic slashing: penalty(c') = (c')^2 * miss_rate vs gain(c') = c' * hit_rate.
     At c* = hit_rate (calibrated), FOC is zero. Deviation is suboptimal.

### 6.2 Solver Truthful Bidding

**Proposition 6.2:** In the first-score auction with bond slashing, solvers bidding
their true expected APY (conditional on their strategy set) form a BNE.

**Proof sketch:** See Theorem 4.2. The key insight is that the bond creates a
credible commitment device. Unlike cheap-talk, the bond slash makes the promised
APY a costly signal of solver quality.

## 7. Sybil Cost Analysis

### 7.1 Identity Requirements

Each analyst must pass the AntiSybilGuard with score >= 50, requiring:
- Gitcoin Passport stamps (humanity verification): ~$5 + time cost
- On-chain history (age > 30 days, > 5 transactions): opportunity cost ~$50
- ABNK stake (1000 tokens): capital lockup cost

### 7.2 Sybil Attack Economics

**Cost per sybil identity:**
```
C_sybil = passport_cost + history_cost + stake_cost + gas
        = $5 + $50 + 1000 * P_ABNK + ~$2
        ≈ $57 + 1000 * P_ABNK
```

At ABNK = $0.10: C_sybil ≈ $157 per identity.

**Revenue per sybil identity per epoch:**
```
R_sybil = fee_share_increment * epoch_fees ≈ (1/N) * TOTAL_FEES
```

With 100 analysts and $5000 weekly fees: R_sybil ≈ $50/week.

**Break-even:** 157/50 ≈ 3.1 weeks. However, reputation starts at zero and takes
~8 weeks to reach meaningful fee-share levels, making the effective break-even
~11 weeks -- well within the detection window for anomalous behavior patterns.

### 7.3 Detection Mechanisms

- Clustering analysis on signal correlation (sybils tend to post identical signals)
- Graph analysis on fund flow (shared funding sources)
- Temporal analysis (registration bursts)
- Governance-triggered investigation (veABNK holders can flag suspicious accounts)

## 8. Mechanism Parameters and Governance

All mechanism parameters are governable via veABNK voting:

| Parameter | Current | Range | Governance Delay |
|-----------|---------|-------|-----------------|
| AUCTION_DURATION | 30 min | 10-120 min | 48h timelock |
| MIN_BOND_BPS | 500 | 100-2000 | 48h timelock |
| SLASH_RATE | 50% | 10-90% | 7d timelock |
| REPUTATION_DECAY | 0.95 | 0.80-0.99 | 48h timelock |
| SYBIL_THRESHOLD | 50 | 30-80 | 7d timelock |
| MIN_ANALYST_STAKE | 1000 ABNK | 100-10000 | 48h timelock |

## 9. Open Problems and Future Work

1. **Dynamic mechanism design:** Adapting parameters in real-time based on observed
   market conditions (volatility regimes, participation rates).

2. **Cross-chain incentive alignment:** Ensuring consistent mechanism behavior when
   intents span multiple chains via LayerZero OFT bridges.

3. **AI agent coordination:** Formal analysis of emergent behavior when multiple
   autonomous agents interact through the protocol simultaneously.

4. **MEV resistance:** Extending commit-reveal to cover solver execution, preventing
   sandwich attacks on vault rebalancing transactions.

5. **Reputation portability:** ZK proofs of reputation for privacy-preserving
   cross-protocol analyst credentials.
