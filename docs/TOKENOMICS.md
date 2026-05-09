# AgentBank Tokenomics (M21)

## 1. Token Overview

| Property | Value |
|----------|-------|
| Name | AgentBank |
| Symbol | ABNK |
| Standard | ERC-20 (with ERC-20Permit, ERC-20Votes) |
| Max Supply | 100,000,000 ABNK |
| Decimals | 18 |
| Chain | Mantle L2 (native), bridgeable via LayerZero OFT |

## 2. Supply Schedule

ABNK follows a front-loaded emission schedule designed to bootstrap network effects
while ensuring long-term scarcity through decreasing issuance.

### 2.1 Emission Curve

```
Year 1: 40,000,000 ABNK (40% of max supply)
Year 2: 25,000,000 ABNK (25%)
Year 3: 20,000,000 ABNK (20%)
Year 4: 10,000,000 ABNK (10%)
Year 5:  5,000,000 ABNK (5%)
─────────────────────────────────
Total: 100,000,000 ABNK
```

### 2.2 Monthly Emission (Year 1 Breakdown)

```
Month 1-3:  5,000,000/month  (TGE + initial liquidity)
Month 4-6:  3,333,333/month  (growth phase)
Month 7-9:  2,500,000/month  (maturation)
Month 10-12: 2,222,222/month (stabilization)
```

## 3. Distribution Table

| Allocation | Amount | % | Vesting |
|-----------|--------|---|---------|
| Protocol Rewards | 35,000,000 | 35% | Emitted per epoch over 5 years |
| Team & Contributors | 20,000,000 | 20% | 1yr cliff, 3yr linear vest |
| Treasury | 15,000,000 | 15% | Governance-controlled |
| Investors (Seed) | 10,000,000 | 10% | 6mo cliff, 2yr linear vest |
| Investors (Strategic) | 8,000,000 | 8% | 6mo cliff, 18mo linear vest |
| Liquidity Mining | 7,000,000 | 7% | Distributed to LPs over 2 years |
| Ecosystem Grants | 3,000,000 | 3% | Governance-approved disbursements |
| Airdrop | 2,000,000 | 2% | Immediate (with anti-sybil) |

### 3.1 Unlock Schedule Visualization

```
        TGE  M6   M12  M18  M24  M30  M36  M42  M48  M60
        |    |    |    |    |    |    |    |    |    |
Team    [====cliff====|============linear============]
Seed    [==cliff==|========linear========]
Strat   [==cliff==|=====linear=====]
Rewards [===============================ongoing=================]
LM      [==============ongoing==============]
Treasury        [governance-controlled, no fixed schedule]
Airdrop [*]
```

## 4. Utility Breakdown

ABNK serves four primary functions within the protocol:

### 4.1 Governance (veABNK Voting)

- **Parameter governance:** Adjust protocol parameters (auction duration, slash rates,
  fee splits, supported assets, strategy whitelists).
- **Code approval:** Vote to approve new code hashes for TEE attestation.
- **Treasury allocation:** Direct treasury funds to grants, buybacks, or burns.
- **Emergency actions:** Circuit breaker activation (requires supermajority 67%).

Voting power is proportional to veABNK balance (time-weighted locked ABNK).

### 4.2 Staking & Security

- **Analyst stake:** Minimum 1000 ABNK required to register as analyst. Slashable
  for consistently poor signal quality (< 40% accuracy over 4 epochs).
- **Solver bond augmentation:** Solvers can post ABNK as additional bond collateral
  at a 1.5x multiplier vs stablecoins (incentivizes ABNK demand).
- **Protocol insurance:** Staked ABNK serves as backstop capital for vault losses
  exceeding normal parameters.

### 4.3 Fee Capture

Protocol fees flow through ABNK:
- 80% of protocol fees -> veABNK holders (proportional to voting power)
- 10% of protocol fees -> treasury
- 10% of protocol fees -> burned (deflationary pressure)

### 4.4 Access & Incentives

- **Signal NFT minting:** Requires ABNK burn (amount proportional to signal PnL)
- **Priority intent matching:** Higher ABNK stake = priority in auction tiebreakers
- **Reputation bootstrapping:** New analysts can burn ABNK to accelerate initial
  reputation accrual (capped at 2x normal rate)

## 5. veABNK Mechanics

### 5.1 Lock Parameters

| Parameter | Value |
|-----------|-------|
| Minimum lock | 7 days |
| Maximum lock | 4 years (1461 days) |
| Voting power formula | `amount * timeRemaining / MAX_LOCK` |
| Decay | Linear (continuous) |
| Actions while locked | Vote, claim fees, delegate |
| Early unlock | Not supported (must wait until expiry) |

### 5.2 Voting Power Examples

```
Lock 10,000 ABNK for 4 years: 10,000 veABNK (maximum)
Lock 10,000 ABNK for 2 years:  5,000 veABNK
Lock 10,000 ABNK for 1 year:   2,500 veABNK
Lock 10,000 ABNK for 7 days:      19 veABNK (minimum meaningful)
```

### 5.3 Decay Mechanics

Voting power decays linearly toward zero as the lock approaches expiry:

```
votingPower(t) = lockedAmount * max(0, lockEnd - t) / MAX_LOCK
```

Users can extend their lock at any time to restore voting power. They can also
increase the locked amount without extending the duration.

### 5.4 Fee Distribution

veABNK holders claim accumulated protocol fees weekly:

```
claimable(user) = totalFeesThisEpoch * user.veABNK / totalVeABNK
```

Unclaimed fees roll over (no expiry). Fees are distributed in the underlying
fee token (MNT on Mantle, bridged stablecoins on other chains).

### 5.5 Delegation

veABNK voting power can be delegated to another address without transferring
the underlying lock. This enables:
- Governance participation by custodial wallets
- Vote aggregation by protocol politicians
- DAO-to-DAO delegation

## 6. Fee Switch

### 6.1 Fee Sources

| Source | Rate | Recipient |
|--------|------|-----------|
| Vault management fee | 0.5% AUM/year | Protocol |
| Vault performance fee | 10% of profits | Protocol |
| Intent auction fee | 0.1% of matched amount | Protocol |
| Signal NFT mint | 50 ABNK burn | Burn address |
| Solver registration | 500 ABNK stake | Staking contract |
| Cross-chain bridge fee | 0.05% of bridged amount | Protocol |

### 6.2 Fee Flow Diagram

```
                    Vault Fees ─────────┐
                    Intent Fees ────────┼──> FeeDistributor
                    Bridge Fees ────────┘         |
                                                  |
                         ┌────────────────────────┼────────────────┐
                         |                        |                |
                         v                        v                v
                   veABNK Holders (80%)      Treasury (10%)    Burn (10%)
```

### 6.3 Fee Switch Governance

The fee switch can be activated/deactivated by governance vote:
- **Activation threshold:** 51% of veABNK voting in favor
- **Deactivation threshold:** 51% of veABNK voting against
- **Timelock:** 7 days between vote passage and execution
- **Fee rate changes:** Bounded to +/- 50% of current rate per proposal

### 6.4 Revenue Projections (Illustrative)

Assuming $50M TVL and moderate activity:

```
Vault management fee:  $50M * 0.5% = $250,000/year
Vault performance fee: $50M * 8% returns * 10% = $400,000/year
Intent fees:           $200M annual volume * 0.1% = $200,000/year
Bridge fees:           $100M bridged * 0.05% = $50,000/year
───────────────────────────────────────────────────────────────
Total protocol revenue: ~$900,000/year

Distribution:
  veABNK holders: $720,000/year
  Treasury:       $90,000/year
  Burned:         $90,000/year (at $0.10/ABNK = 900,000 ABNK burned)
```

## 7. Deflationary Mechanisms

### 7.1 Direct Burns
- Signal NFT minting (50 ABNK per mint)
- 10% of protocol fees converted to ABNK and burned
- Reputation boost burns (up to 500 ABNK per analyst per epoch)

### 7.2 Indirect Supply Reduction
- veABNK locks (tokens removed from circulation for up to 4 years)
- Analyst stakes (minimum 1000 ABNK locked while registered)
- Solver bonds (ABNK bonds locked during active bids)

### 7.3 Burn Rate Projections

Conservative estimate at maturity:
```
NFT mints:        100/month * 50 ABNK = 5,000 ABNK/month
Fee burns:        $7,500/month / $0.10 = 75,000 ABNK/month
Reputation burns: 50 analysts * 100 ABNK avg = 5,000 ABNK/month
──────────────────────────────────────────────────────────────
Total burn rate: ~85,000 ABNK/month = ~1,020,000 ABNK/year (1.02% of supply)
```

## 8. Cross-Chain Token Design

### 8.1 OFT (Omnichain Fungible Token) via LayerZero

ABNK is deployed as a native token on Mantle with OFT adapters for:
- Ethereum mainnet (for DEX liquidity)
- Arbitrum (for DeFi composability)
- Base (for retail access)

### 8.2 Supply Accounting

Total supply across all chains always equals minted supply on Mantle:
```
supply_mantle + supply_ethereum + supply_arbitrum + supply_base = total_minted
```

Bridge operations burn on source chain and mint on destination (lock-and-mint
pattern implemented via LayerZero message passing).

### 8.3 veABNK Cross-Chain

Voting power is chain-local. veABNK on Mantle governs the core protocol. Future
work may introduce cross-chain governance via LayerZero messaging for chain-specific
parameter governance.

## 9. Token Launch Strategy

### 9.1 Phase 1: Testnet (Months -3 to 0)
- Testnet ABNK for protocol testing
- Points program tracking early contributors

### 9.2 Phase 2: TGE (Month 0)
- Airdrop to points holders (2% of supply)
- Initial DEX liquidity (from treasury allocation)
- CEX listings (tier-2 initially)

### 9.3 Phase 3: Growth (Months 1-12)
- Liquidity mining programs
- Partnership integrations
- Governance activation (veABNK live at month 3)

### 9.4 Phase 4: Maturity (Year 2+)
- Fee switch activation
- Emission reduction per schedule
- Community-driven parameter optimization
