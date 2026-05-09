# AgentBank V3 Architecture Overview

## 1. Introduction

AgentBank V3 extends the protocol from a vault-centric DeFi system to a full-stack
verifiable AI agent economy. This document describes the architecture of four new
layers: Verifiable AI, Intent System, Cross-Chain Infrastructure, and Token Economy.

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER / AGENT INTERFACE                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │  TypeScript   │  │   Python     │  │   Telegram    │  │     PWA       │  │
│  │     SDK       │  │     SDK      │  │     Bot       │  │  Leaderboard  │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  └───────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │                  │
          ▼                  ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PROTOCOL CONTRACTS (Mantle L2)                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LAYER 4: TOKEN ECONOMY                            │    │
│  │  ┌────────────┐  ┌───────────────┐  ┌────────────────┐             │    │
│  │  │ ABNKToken   │  │ VotingEscrow  │  │ FeeDistributor │             │    │
│  │  │ (ERC-20)   │  │ (veABNK)      │  │                │             │    │
│  │  └────────────┘  └───────────────┘  └────────────────┘             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LAYER 3: CROSS-CHAIN                              │    │
│  │  ┌──────────────────┐  ┌─────────────────────────────────┐         │    │
│  │  │ AgentBankOFT      │  │ CrossChainEntrypoint            │         │    │
│  │  │ (LayerZero)       │  │ (multi-chain intent routing)    │         │    │
│  │  └──────────────────┘  └─────────────────────────────────┘         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LAYER 2: INTENT SYSTEM                            │    │
│  │  ┌──────────────┐  ┌────────────────┐  ┌────────────────────┐      │    │
│  │  │ IntentRouter  │  │ SolverRegistry │  │ SignalAuctionHouse │      │    │
│  │  │              │  │                │  │                    │      │    │
│  │  └──────────────┘  └────────────────┘  └────────────────────┘      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LAYER 1: VERIFIABLE AI                            │    │
│  │  ┌──────────────────────┐  ┌─────────────────┐  ┌──────────────┐   │    │
│  │  │ TEEAttestationVerifier│  │ AlloraConsumer  │  │ SignalNFT    │   │    │
│  │  │ (Phala + Marlin)     │  │ (ML oracle)     │  │ (ERC-721)    │   │    │
│  │  └──────────────────────┘  └─────────────────┘  └──────────────┘   │    │
│  │  ┌──────────────────────┐  ┌─────────────────┐                     │    │
│  │  │ OpenGradientReader   │  │ CommitRevealSig │                     │    │
│  │  │ (on-chain ML)        │  │ (MEV-resistant) │                     │    │
│  │  └──────────────────────┘  └─────────────────┘                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LAYER 0: CORE (V1/V2)                             │    │
│  │  ┌────────────────┐  ┌─────────────┐  ┌────────────────────────┐   │    │
│  │  │ AgentBankVault │  │ SignalBoard  │  │ AgentAccountFactory    │   │    │
│  │  │ (ERC-4626)     │  │             │  │ (ERC-6551)             │   │    │
│  │  └────────────────┘  └─────────────┘  └────────────────────────┘   │    │
│  │  ┌────────────────┐  ┌─────────────┐  ┌────────────────────────┐   │    │
│  │  │ AgentIdentity  │  │ Strategies  │  │ AntiSybilGuard         │   │    │
│  │  │ (ERC-721)      │  │ (pluggable) │  │ (Passport integration) │   │    │
│  │  └────────────────┘  └─────────────┘  └────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OFF-CHAIN INFRASTRUCTURE                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Orchestrator │  │ TEE Runtimes │  │  Subgraph    │  │   Solver     │    │
│  │ (Python)     │  │ (Phala/Mrlm) │  │  (indexer)   │  │   Engines    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3. Layer 1: Verifiable AI

### 3.1 TEE Attestation Pipeline

The TEEAttestationVerifier contract provides on-chain proof that an agent's reasoning
was executed in a trusted execution environment.

```
┌─────────────┐     ┌───────────────┐     ┌──────────────────────┐
│ Agent Code  │────>│ TEE Runtime   │────>│ Signed Attestation   │
│ (hash: C)   │     │ (Phala/Marlin)│     │ sig(H(prompt,output,C))│
└─────────────┘     └───────────────┘     └──────────┬───────────┘
                                                      │
                                                      ▼
                                          ┌──────────────────────┐
                                          │ TEEAttestationVerifier│
                                          │ .attestRun(...)       │
                                          │ -> verified on-chain  │
                                          └──────────────────────┘
```

**Dual-TEE Security:** For high-value operations, the protocol requires attestation
from both Phala and Marlin TEE environments. Single TEE compromise does not break
the verification guarantee.

### 3.2 On-Chain ML Integration

Two complementary approaches for on-chain ML inference:

1. **AlloraConsumer:** Pulls inference results from Allora's decentralized ML network.
   Used for market prediction confidence scores that weight analyst signals.

2. **OpenGradientReader:** Executes lightweight ML models directly on-chain via
   OpenGradient's verifiable compute layer. Used for anomaly detection on vault
   rebalancing parameters.

### 3.3 Commit-Reveal Signal Posting

To prevent front-running of analyst signals:

```
Phase 1 (Commit):  analyst submits H(signal || salt)     [block N]
Phase 2 (Reveal):  analyst reveals signal + salt          [block N+30]
Phase 3 (Active):  signal becomes actionable              [block N+30]
```

The 30-block delay (approximately 1 minute on Mantle) ensures that MEV searchers
cannot extract value from signal content before it becomes public.

### 3.4 Signal NFTs

Executed signals with positive PnL can be minted as ERC-721 tokens:

```
SignalNFT {
  signalId:      uint256   // reference to original signal
  analyst:       address   // signal creator
  pnl:           int256    // realized profit/loss
  reasoningHash: bytes32   // link to TEE-attested reasoning
  attestationId: bytes32   // link to TEE verification
}
```

These NFTs serve as provable track records and can be traded on secondary markets.

## 4. Layer 2: Intent System

### 4.1 Intent Lifecycle

```
┌──────────┐    ┌───────────┐    ┌─────────────┐    ┌──────────┐
│  Posted  │───>│  Auction  │───>│  Settled    │───>│  Filled  │
│          │    │  (30 min) │    │  (winner)   │    │          │
└──────────┘    └───────────┘    └─────────────┘    └──────────┘
     │                                                    │
     │          ┌───────────┐                             │
     └─────────>│ Cancelled │                             │
     (by user)  └───────────┘                             │
                                                          ▼
                                                   ┌──────────┐
                                                   │  Vault   │
                                                   │  Deposit │
                                                   └──────────┘
```

### 4.2 Auction Mechanism

The IntentRouter runs a first-score sealed-bid auction:

1. **User posts intent:** Specifies asset, amount, minAPY, maxDrawdown, duration
2. **Solvers bid:** Each solver proposes a vault + promised APY + bond
3. **Scoring:** `score = promisedAPY * sqrt(bondPosted)` (higher is better)
4. **Settlement:** After AUCTION_DURATION, anyone can call `settleAuction()`
5. **Execution:** Winning solver's vault receives the depositor's funds

### 4.3 Solver Registry

Solvers must register with minimum bond and pass reputation checks:

```
SolverRegistry
├── registerSolver(bondAmount, metadata)
├── deregisterSolver()
├── slashSolver(solverId, amount, reason)
├── getSolverReputation(solver) -> (score, fills, slashes)
└── isActiveSolver(solver) -> bool
```

### 4.4 Signal Auction House

A secondary market for analyst signals:

```
SignalAuctionHouse
├── listSignal(signalId, reservePrice, duration)
├── bidOnSignal(listingId, amount)
├── settleSignalAuction(listingId)
└── cancelListing(listingId)
```

Allows passive capital to purchase proven signals for automated execution.

## 5. Layer 3: Cross-Chain Infrastructure

### 5.1 Omnichain Token (OFT)

```
┌──────────┐         LayerZero          ┌──────────────┐
│  Mantle  │◄──────────────────────────►│  Ethereum    │
│  ABNK    │         Messages           │  ABNK (OFT)  │
│ (native) │                            │              │
└──────────┘                            └──────────────┘
      ▲                                        ▲
      │              LayerZero                 │
      │◄──────────────────────────────────────►│
      │                                        │
      ▼                                        ▼
┌──────────┐                            ┌──────────────┐
│ Arbitrum │                            │    Base      │
│ ABNK(OFT)│                            │  ABNK (OFT) │
└──────────┘                            └──────────────┘
```

### 5.2 Cross-Chain Entrypoint

The CrossChainEntrypoint allows users on any supported chain to:
- Post intents that are routed to Mantle for auction settlement
- Bridge deposits directly into Mantle vaults
- Receive yield back on their origin chain

```
User (Arbitrum) ──> CrossChainEntrypoint (Arbitrum)
                          │
                          │ LayerZero message
                          ▼
                    IntentRouter (Mantle) ──> Vault (Mantle)
                          │
                          │ yield accrues
                          ▼
                    CrossChainEntrypoint (Mantle)
                          │
                          │ LayerZero message
                          ▼
                    User receives yield (Arbitrum)
```

### 5.3 Message Format

Cross-chain messages use a standardized envelope:

```solidity
struct CrossChainMessage {
    uint8 msgType;       // INTENT_POST, DEPOSIT, WITHDRAW, YIELD_CLAIM
    address sender;      // origin chain sender
    uint16 srcChainId;   // LayerZero chain ID
    bytes payload;       // type-specific encoded data
    uint256 nonce;       // replay protection
}
```

## 6. Layer 4: Token Economy

### 6.1 Token Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     ABNK Token Flows                      │
│                                                          │
│  Minting ──────────────────────────────────────┐         │
│  (MINTER_ROLE)                                 │         │
│                                                ▼         │
│                                         ┌──────────┐     │
│  Protocol Rewards ─────────────────────>│  Users   │     │
│  (epoch emissions)                      └────┬─────┘     │
│                                              │           │
│                              ┌───────────────┼───────┐   │
│                              │               │       │   │
│                              ▼               ▼       ▼   │
│                      ┌─────────────┐  ┌────────┐ ┌─────┐│
│                      │VotingEscrow │  │Staking │ │Trade ││
│                      │(lock->veABNK)│  │(analyst)│ │     ││
│                      └──────┬──────┘  └───┬────┘ └─────┘│
│                             │             │              │
│                             ▼             │              │
│                      ┌─────────────┐      │              │
│                      │   Voting    │      │              │
│                      │   Power     │      │              │
│                      └──────┬──────┘      │              │
│                             │             │              │
│                             ▼             ▼              │
│                      ┌─────────────────────────┐         │
│                      │    FeeDistributor       │         │
│                      │  (80% veABNK, 10% treas,│         │
│                      │   10% burn)             │         │
│                      └─────────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

### 6.2 FeeDistributor

Aggregates all protocol fees and distributes weekly:

```
FeeDistributor
├── depositFees(token, amount)          // called by vaults/router
├── checkpoint()                         // update reward accounting
├── claim(user)                          // user claims accumulated fees
├── setFeeRatio(veRatio, treasRatio, burnRatio)  // governance
└── totalDistributed() -> uint256
```

## 7. Data Flow: Complete Intent Resolution

End-to-end flow for a user deposit via intent system:

```
Step 1: User posts intent via SDK
        └─> IntentRouter.postIntent(USDY, 10000e18, 500, 200, 30days)
            └─> event IntentPosted(id=42, ...)
                └─> Subgraph indexes intent

Step 2: Solvers observe new intent (via subgraph or events)
        └─> Solver evaluates available vaults
            └─> IntentRouter.submitBid(42, vault_addr, 650, bond)
                └─> event BidSubmitted(bidId=7, intentId=42, ...)

Step 3: Auction expires (30 minutes)
        └─> Keeper calls IntentRouter.settleAuction(42)
            └─> Winning bid selected (highest score)
            └─> User funds routed to winning vault
            └─> event IntentFilled(42, winningBid=7)

Step 4: Yield accrues in vault
        └─> ERC-4626 share price appreciates
        └─> User can withdraw after duration

Step 5: Signal generation (analyst observes market)
        └─> CommitRevealSignal.commitSignal(hash)
            └─> [30 blocks later]
            └─> CommitRevealSignal.revealSignal(asset, direction, magnitude, salt)
                └─> TEEAttestationVerifier.attestRun(proof)

Step 6: Fee distribution (weekly)
        └─> FeeDistributor.checkpoint()
        └─> veABNK holders call claim()
```

## 8. Security Architecture

### 8.1 Access Control Matrix

```
┌─────────────────────────┬───────────┬───────────┬──────────┬──────────┐
│ Contract                │ Admin     │ Operator  │ User     │ Anyone   │
├─────────────────────────┼───────────┼───────────┼──────────┼──────────┤
│ ABNKToken.mint          │     X     │           │          │          │
│ ABNKToken.burn          │     X     │           │          │          │
│ VotingEscrow.createLock │           │           │    X     │          │
│ IntentRouter.postIntent │           │           │    X     │          │
│ IntentRouter.settle     │           │           │          │    X     │
│ TEEVerifier.attestRun   │           │     X     │          │          │
│ TEEVerifier.approveCode │     X     │           │          │          │
│ FeeDistributor.claim    │           │           │    X     │          │
│ SignalBoard.postSignal  │           │           │    X*    │          │
│ SolverRegistry.register │           │           │    X*    │          │
└─────────────────────────┴───────────┴───────────┴──────────┴──────────┘
* = requires stake/bond
```

### 8.2 Circuit Breakers

Emergency pause mechanisms at each layer:

- **Vault level:** Pause deposits/withdrawals (guardian multisig, 2/3)
- **Intent level:** Pause new intents + force-expire open auctions
- **Bridge level:** Pause cross-chain messages (LayerZero security council)
- **Protocol level:** Global pause via governance supermajority (67% veABNK)

### 8.3 Upgrade Path

Contracts use a proxy pattern (UUPS) where applicable:
- Implementation upgrades require governance vote + 7-day timelock
- Immutable contracts (ABNKToken, VotingEscrow) cannot be upgraded
- Peripheral contracts (strategies, adapters) are swappable via registry

## 9. Deployment Addresses

| Contract | Network | Status |
|----------|---------|--------|
| ABNKToken | Mantle | Deployed |
| VotingEscrow | Mantle | Deployed |
| FeeDistributor | Mantle | Deployed |
| IntentRouter | Mantle | Deployed |
| SolverRegistry | Mantle | Deployed |
| TEEAttestationVerifier | Mantle | Deployed |
| SignalNFT | Mantle | Deployed |
| AgentBankOFT | Ethereum, Arbitrum, Base | Pending |
| CrossChainEntrypoint | Ethereum, Arbitrum, Base | Pending |

## 10. Development Roadmap

### Phase 1 (Current): Core V3
- Token + veABNK governance
- Intent system with solver auctions
- TEE attestation for agent runs
- Signal NFTs

### Phase 2: Cross-Chain Expansion
- OFT deployment to Ethereum, Arbitrum, Base
- Cross-chain intent routing
- Multi-chain fee aggregation

### Phase 3: Advanced AI Integration
- On-chain ML inference via OpenGradient
- Allora-powered signal confidence scoring
- Autonomous agent strategies with verified reasoning

### Phase 4: Full Decentralization
- Permissionless solver registration
- Community-governed parameter optimization
- DAO treasury diversification
