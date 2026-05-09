# AgentBank TVL Bootstrap Plan (M23)

## Overview

This document outlines the phased approach to bootstrapping Total Value Locked on Mantle mainnet, targeting $100k TVL within the first 30 days post-launch. The plan balances rapid growth with risk management through insurance-backed guarantees and controlled deposit caps.

---

## Phase 1: KOL Pre-Seed

**Timeline:** Days 1-7
**Target:** $7,500 - $10,000 TVL

### Parameters
- 15-20 crypto-native KOLs (DeFi, AI x Crypto verticals)
- $500 deposit per KOL
- ABNK airdrop: 5,000 ABNK per participant (vested 90 days linear)
- Early depositor multiplier: 2x reputation boost for first 7 days
- Exclusive access to "Founding Analyst" NFT badge

### Selection Criteria
- Minimum 5,000 followers on CT (Crypto Twitter)
- History of engaging with DeFi protocol launches
- Not associated with rug pulls or scam promotions
- Preference for KOLs active in Mantle ecosystem
- Must agree to provide feedback during first 14 days

### KOL Deliverables
- 1 thread (minimum 5 tweets) covering deposit experience
- 1 screenshot of dashboard shared publicly
- Optional: video walkthrough (bonus 2,000 ABNK)

### Tracking
- Dedicated Dune dashboard panel for KOL cohort
- Weekly retention report to team Slack channel
- Exit interviews at day 14

---

## Phase 2: Mantle Community Drop

**Timeline:** Days 8-14
**Target:** $10,000 additional TVL (cumulative $17,500 - $20,000)

### Parameters
- 50 whitelisted wallets from Mantle community
- $200 deposit cap per wallet
- Source: Mantle Discord active members, Mantle Expedition participants
- Eligibility: minimum 3 transactions on Mantle mainnet in past 30 days
- ABNK airdrop: 1,000 ABNK per participant (vested 60 days)

### Sybil Prevention
- AntiSybilGuard contract enforces Gitcoin Passport score >= 15
- Wallet age >= 90 days on Ethereum mainnet
- No more than 2 wallets per IP during whitelist application
- Human verification via Mantle Discord role check

### Community Incentives
- Top 10 depositors by duration get bonus 500 ABNK
- Referral bonus: 200 ABNK per successful referral (max 5)
- Weekly AMA access with core team

---

## Phase 3: Insurance-Backed Open Launch

**Timeline:** Days 15-30
**Target:** $100,000 TVL cap

### Parameters
- Open deposits, no whitelist required
- Per-wallet cap: $5,000
- Global TVL hard cap: $100,000 (enforced on-chain)
- Insurance coverage: 10% of TVL ($10,000 buffer)
- Insurance funded from: protocol treasury + partner contribution

### Insurance Buffer Math

```
TVL_CAP         = $100,000
COVERAGE_RATE   = 10%
INSURANCE_FUND  = TVL_CAP * COVERAGE_RATE = $10,000

Funding sources:
  - Protocol treasury:     $6,000 (60%)
  - Mantle ecosystem fund: $3,000 (30%)
  - Early fee revenue:     $1,000 (10%)

Claim conditions:
  - Vault drawdown > 5% in 24h period triggers review
  - Drawdown > 10% in 24h triggers automatic circuit breaker
  - Claims processed within 72 hours of circuit breaker event
  - Maximum individual claim: min(deposit * 10%, $500)

Coverage duration: 90 days from deposit date
Renewal: subject to governance vote after initial period
```

### Risk Parameters
- Circuit breaker threshold: 10% drawdown in 24h
- Strategy allocation limit: 30% per single strategy
- Rebalance cooldown: 6 hours minimum between strategy shifts
- Oracle staleness: 1 hour maximum for Pyth/Allora feeds

---

## Phase 4: Demo Day

**Timeline:** Day 30
**Target:** Showcase metrics, announce Phase 5 plans

### Agenda
- Live dashboard walkthrough (TVL, returns, signal accuracy)
- Top analyst performance showcase
- LLM head-to-head results reveal
- Insurance pool utilization report
- Announce expanded TVL cap and new strategy integrations
- Community Q&A

### Success Metrics for Demo Day
- TVL >= $75,000 (75% of cap)
- Depositor retention >= 80% (deposits held >= 14 days)
- Signal accuracy >= 60% across all analysts
- Zero critical security incidents
- Insurance claims < 2% of fund

---

## KOL Outreach Template

Subject: **Exclusive early access: AgentBank V3 on Mantle - AI-managed DeFi treasury**

```
Hi [Name],

We're reaching out because your coverage of [specific topic they covered]
resonated with what we're building at AgentBank.

AgentBank is a multi-agent DeFi treasury on Mantle where LLM-powered analysts
compete to generate alpha, and their reasoning is verified on-chain. Think of
it as a vault where AI agents publish trading signals, stake on their
conviction, and get slashed if they're wrong.

We're inviting 15 KOLs for a pre-seed deposit round:
  - $500 USDC deposit into the vault
  - 5,000 ABNK airdrop (vested 90 days)
  - "Founding Analyst" NFT badge
  - Direct Telegram group with core team
  - 2x reputation multiplier for early signals

The vault is audited by Cantina, insured at 10% coverage, and has a hard
circuit breaker at 10% drawdown. Your funds can be withdrawn at any time.

Interested? Reply and I'll send the whitelist link + deposit instructions.

Best,
[Team member name]
AgentBank Core Team
```

---

## Insurance Buffer Math (Detailed)

### Scenario Analysis

| Scenario | Drawdown | Claims | Insurance Payout | Fund Remaining |
|----------|----------|--------|-----------------|----------------|
| Normal operation | 0-2% | 0 | $0 | $10,000 |
| Mild correction | 3-5% | ~5 | $1,250 | $8,750 |
| Strategy underperformance | 5-8% | ~15 | $3,750 | $6,250 |
| Black swan (circuit breaker) | 10%+ | ~40 | $10,000 | $0 |

### Assumptions
- Average deposit size: $2,500
- 40 depositors at capacity
- Claims are capped at 10% of individual deposit
- Circuit breaker prevents losses beyond 10% threshold
- Insurance fund replenished from protocol fees (2% of profits)

### Replenishment Rate
- Expected monthly vault yield: 5-12% APY on strategies
- Protocol fee: 10% of yield
- Monthly fee revenue at $100k TVL and 8% APY: ~$667
- Insurance allocation (30% of fees): ~$200/month
- Full replenishment after moderate claim event: ~6 months

---

## Public Dashboard Requirements

### Required Panels (real-time, updated every block)
1. **Total TVL** - current vault totalAssets in USD
2. **Depositor Count** - unique addresses with shares > 0
3. **Insurance Coverage Ratio** - insurance fund / TVL
4. **7-Day Vault APY** - rolling annualized return
5. **Circuit Breaker Status** - active/inactive with last trigger time
6. **Top 5 Analysts** - ranked by PnL with reputation scores
7. **Strategy Allocation** - pie chart of fund distribution
8. **Recent Signals** - last 10 submitted signals with outcomes

### Technical Implementation
- Dune Analytics embedded iframes for complex queries
- On-chain reads via Mantle RPC for real-time data
- PWA leaderboard at `pwa-leaderboard/` for mobile access
- Telegram mini-app integration for quick checks
- Auto-refresh interval: 30 seconds for TVL, 5 minutes for analytics

### Access Control
- Public: TVL, depositor count, APY, circuit breaker status
- Depositors only: strategy allocation details, analyst rankings
- KOL cohort: advanced analytics, raw signal data export
- Team only: insurance claims processing, risk parameter adjustment
