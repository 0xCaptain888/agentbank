# AgentBank V3 — Demo Day Script (5 minutes)

**Version:** V3 Spec (Section 18.2)
**Duration:** 5 minutes
**Target Audience:** Investors, partners, developer community

---

## Pre-Demo Setup Checklist

Complete all items **at least 30 minutes** before the demo begins.

### Infrastructure

- [ ] Verify all V3 contracts are deployed and verified on Mantle mainnet
- [ ] Confirm Arbitrum CrossChainEntrypoint is live and LayerZero relayer is healthy
- [ ] Confirm Phala TEE worker is online and attestation endpoint responds
- [ ] Ensure IntentRouter has at least 3 registered solvers with active stakes
- [ ] Verify SignalAuctionHouse has recent commit-reveal cycles completing

### Application Layer

- [ ] Telegram Mini App is accessible via @AgentBankV3Bot — test login flow
- [ ] CLI tools installed and authenticated: `npx skills add agentbank/skills`
- [ ] `agentbank-cli vault stats` returns live data (TVL, depositors, ops count)
- [ ] Subgraph is synced to head block (check indexing status)

### Demo Environment

- [ ] Open browser Tab 1: Live TVL dashboard (internal or Dune)
- [ ] Open browser Tab 2: MantleScan — VaultV3 contract address
- [ ] Open browser Tab 3: Telegram Mini App (mobile emulator or phone mirror)
- [ ] Open browser Tab 4: Phala TEE attestation explorer
- [ ] Terminal window 1: CLI ready for `agentbank-cli` commands
- [ ] Terminal window 2: Ready for cross-chain deposit script
- [ ] Pre-fund a fresh wallet with 50 USDC on Arbitrum for cross-chain segment
- [ ] Pre-fund the demo depositor wallet with gas on Mantle

### Data Verification

- [ ] TVL counter shows current value (target: visible and growing)
- [ ] Depositor count is at least 47 (or current live number)
- [ ] Ops executed count is at least 312 (or current live number)
- [ ] Multi-LLM leaderboard has data for DeepSeek, Allora, Llama, Qwen
- [ ] At least one recent operation has a verifiable TEE reasoning record

### Backup Materials

- [ ] Pre-recorded 3-minute video of full flow (in case of network failure)
- [ ] Screenshots of every key screen saved locally
- [ ] Subgraph JSON responses cached for offline fallback
- [ ] PDF of on-chain transaction hashes for all pre-prepared demos

---

## Demo Timeline

---

### Segment 1 — 00:00 to 00:20 | Opening Hook: Live Stats

**Goal:** Immediately establish that this is a live, production system.

**Script:**

> "AgentBank V3 is live. Right now, on Mantle mainnet, you're looking at real
> depositor funds managed by competing AI agents. Let me show you the numbers."

**Actions:**

1. Display the live TVL dashboard in the browser — point to the counter
2. Highlight the three key numbers:
   - **TVL** — total value locked across all vault tiers
   - **47 depositors** — real users with funds in the protocol
   - **312 ops executed** — autonomous AI operations settled on-chain
3. Let the numbers speak for 5 seconds — no narration needed

**Talking Point:**

> "Every one of those 312 operations was proposed by an AI analyst, validated by
> a guard agent, and executed autonomously. All verifiable on-chain."

---

### Segment 2 — 00:20 to 00:50 | Intent Demo: Solver Auction

**Goal:** Show the V3 intent-based architecture with real solver competition.

**Script:**

> "In V3, users don't submit transactions. They submit intents. Solvers compete
> to fill them. Watch."

**Actions:**

1. Switch to the Telegram Mini App (Tab 3)
2. Post a new intent in the TG Mini App:
   - Intent: "Rebalance 20 USDC from conservative to balanced tier"
   - Confirm the intent submission
3. Switch to terminal and run:
   ```bash
   agentbank-cli intents watch --live
   ```
4. Watch the 30-second solver bidding window:
   - Point out **Solver A** bid arriving (~5s)
   - Point out **Solver B** bid arriving (~12s)
   - Point out **Solver C** bid arriving (~20s)
5. At 30s, the best bid is auto-selected and settlement occurs
6. Show the settled transaction hash on MantleScan

**Talking Point:**

> "Three solvers competed in real-time. The best execution won. Users get better
> prices, solvers earn fees, and it's all trustless."

---

### Segment 3 — 00:50 to 01:30 | Verifiable AI: TEE Reasoning Proof

**Goal:** Demonstrate that every AI decision is cryptographically verifiable.

**Script:**

> "Every AI decision in AgentBank generates a reasoning trace inside a Trusted
> Execution Environment. You can verify it yourself. Let me show you."

**Actions:**

1. In the Telegram Mini App, tap on a recent operation from the feed
2. The operation detail view opens — point to the reasoning summary
3. Tap **"View Full Reasoning"** — shows the LLM prompt, output, and hash
4. Tap the **"Verify"** button
5. Switch to the TEE attestation explorer (Tab 4):
   - Show the live on-chain check of the Phala TEE attestation quote
   - The verification runs against the TEEAttestationVerifier contract
6. Wait for the green **"Verified"** badge to appear (~3-5 seconds)
7. Optionally run from CLI:
   ```bash
   agentbank-cli reasoning verify --op-id <recent_op_id>
   ```

**Talking Point:**

> "That green badge means the reasoning was generated inside a TEE, the hash
> matches on-chain, and nobody — not even us — could have tampered with it.
> This is what verifiable AI looks like."

---

### Segment 4 — 01:30 to 02:00 | Multi-LLM Leaderboard

**Goal:** Show that multiple LLMs compete and are ranked by real performance.

**Script:**

> "AgentBank isn't married to one model. Four different LLMs compete as analysts,
> and their performance is tracked on-chain."

**Actions:**

1. Run the leaderboard command:
   ```bash
   agentbank-cli analysts leaderboard -o table
   ```
2. Display the output showing:
   | Model     | Avg PnL | Signals | Win Rate |
   |-----------|---------|---------|----------|
   | DeepSeek  | 7.2%    | 89      | 68%      |
   | Allora    | 6.8%    | 74      | 65%      |
   | Llama     | 5.5%    | 102     | 59%      |
   | Qwen      | 4.9%    | 61      | 55%      |
3. Point out that DeepSeek is leading but Llama has the most signals

**Talking Point:**

> "Reputation is earned, not assigned. If a better model appears tomorrow, it can
> join the marketplace and start competing immediately."

---

### Segment 5 — 02:00 to 02:30 | Cross-Chain: Arbitrum Deposit via OFT

**Goal:** Show seamless cross-chain UX powered by LayerZero OFT.

**Script:**

> "AgentBank lives on Mantle, but your money doesn't have to. Watch me deposit
> from Arbitrum."

**Actions:**

1. In terminal, execute the cross-chain deposit:
   ```bash
   agentbank-cli deposit \
     --amount 50 \
     --token USDC \
     --from-chain arbitrum \
     --vault balanced
   ```
2. Show the Arbitrum transaction on Arbiscan (pre-open tab if needed)
3. Explain: "The USDC is locked on Arbitrum, ABV2 OFT mints on Mantle"
4. Wait ~90 seconds for the LayerZero message to land
5. Show the Mantle-side receipt:
   ```bash
   agentbank-cli deposit status --tx <arb_tx_hash>
   ```
6. Confirm the 50 USDC is now reflected in vault balance

**Talking Point:**

> "90 seconds, Arbitrum to Mantle, no bridge UI, no manual steps. The OFT
> standard handles everything."

---

### Segment 6 — 02:30 to 03:00 | Skills CLI Integration

**Goal:** Show that any LLM agent can interact with AgentBank via the Skills CLI.

**Script:**

> "AgentBank is also a tool. Any AI — Claude, ChatGPT, Cursor — can operate
> our vault through the Skills CLI."

**Actions:**

1. Install the skills package (if not pre-installed):
   ```bash
   npx skills add agentbank/skills
   ```
2. Run vault stats:
   ```bash
   agentbank-cli vault stats
   ```
3. Show the JSON output with TVL, depositor count, and tier breakdown
4. Optionally show catalog:
   ```bash
   agentbank-cli catalog list -o json | head -20
   ```

**Talking Point:**

> "This means AgentBank becomes composable infrastructure. Any agent framework
> can plug in and start managing funds."

---

### Segment 7 — 03:00 to 03:30 | ERC-8004 Identity and Reputation

**Goal:** Walk through the on-chain identity standard that makes agent reputation portable.

**Script:**

> "ERC-8004 is our proposed standard for agent identity. Let me show you what
> it looks like on-chain."

**Actions:**

1. On MantleScan (Tab 2), navigate to the IdentityRegistry contract
2. Show registered agents — point to agent type, domain, metadata URI
3. Navigate to the ReputationRegistry:
   - Show a feedback entry with score, context hash, and reason
   - Point out the validation pass-rate for a specific agent
4. Run from CLI:
   ```bash
   agentbank-cli agents reputation --address 0x<agent_address> -o json
   ```
5. Show the ValidationRegistry:
   - Highlight the guard-to-executor validation log
   - Show pass/fail ratio

**Talking Point:**

> "Identity, reputation, and validation — all on-chain, all portable. An agent's
> track record follows it across any protocol that adopts ERC-8004."

---

### Segment 8 — 03:30 to 04:00 | Mechanism Design: Boltzmann Exploration

**Goal:** Show that the protocol actively explores underused analysts.

**Script:**

> "Good mechanism design means the system doesn't just exploit the best agent.
> It explores. Watch."

**Actions:**

1. Show the analyst selection log:
   ```bash
   agentbank-cli analysts selection-log --last 20 -o table
   ```
2. Point to an entry where an analyst with **0 reputation** was selected
3. Explain: "This is Boltzmann exploration. The protocol gives new analysts a
   chance to prove themselves, even with zero track record."
4. Show the temperature parameter:
   ```bash
   agentbank-cli config get exploration.temperature
   ```

**Talking Point:**

> "Without exploration, incumbents dominate forever. Boltzmann sampling gives
> every new analyst a fair shot — and the temperature decays over time as the
> system learns."

---

### Segment 9 — 04:00 to 04:30 | Token: veABNK Lock and Gauge Voting

**Goal:** Demonstrate the token utility loop.

**Script:**

> "The ABNK token isn't just governance. It's the economic backbone. Let me
> lock some tokens and vote."

**Actions:**

1. Run the lock command:
   ```bash
   agentbank-cli token lock --amount 1000 --duration 180d
   ```
2. Show the resulting veABNK balance:
   ```bash
   agentbank-cli token balance --ve
   ```
3. Cast a gauge vote:
   ```bash
   agentbank-cli token vote --gauge balanced-vault --weight 100
   ```
4. Show the updated gauge weights on the dashboard or CLI

**Talking Point:**

> "Lock ABNK, get veABNK, vote on which vaults get more analyst incentives.
> It's a flywheel: more votes, more analysts, more yield, more TVL."

---

### Segment 10 — 04:30 to 05:00 | Closing: What's Next

**Goal:** End with forward momentum and an invitation.

**Script:**

> "Here's where we're headed."

**Actions:**

1. Show the mainnet TVL trajectory graph (dashboard or slide)
2. Highlight key upcoming milestones:
   - Mainnet TVL growth targets
   - Additional chain deployments
   - Analyst marketplace opening to external teams
   - ERC-8004 EIP submission progress

**Closing:**

> "AgentBank V3 is live, verifiable, cross-chain, and composable. The analyst
> marketplace is open. If you want to deploy an AI analyst, compete for yield
> fees, or build on ERC-8004 — come talk to us. Questions?"

---

## Post-Demo Checklist

- [ ] Save all terminal output to `demo-logs/YYYY-MM-DD/` directory
- [ ] Screenshot the final TVL dashboard state
- [ ] Record the cross-chain deposit tx hashes for follow-up verification
- [ ] Export the leaderboard snapshot for the deck appendix
- [ ] Collect audience questions and log them in the project tracker
- [ ] If any segment failed: note which one and the root cause
- [ ] Return demo wallet funds to treasury (do not leave funds in hot wallets)
- [ ] Revoke any temporary authorizations granted for the demo
- [ ] Update the demo metrics in the investor data room

---

## Contingency Plans

### If the network is slow or unresponsive

- Switch to pre-recorded video for the affected segment
- Use cached CLI outputs (saved in `demo-backup/cli-outputs/`)
- Continue with the next segment — do not stall

### If a solver auction has no bids

- Use a pre-prepared intent that has solvers watching
- Fall back to showing a historical auction from the subgraph

### If the cross-chain deposit takes too long

- Explain: "LayerZero finality varies — this is real infrastructure, not a mock"
- Show a pre-completed deposit transaction on MantleScan
- Move to the next segment and return if it lands

### If TEE verification fails

- Show the raw attestation data and explain the verification flow
- Use the CLI fallback: `agentbank-cli reasoning verify --op-id <id>`
- Show a pre-verified example from the attestation explorer

---

## Key Q&A Talking Points

1. **"Why multi-agent vs single agent?"** — Separation of concerns prevents
   single points of failure. The guard cannot be compromised by the same key as
   the executor. Analysts compete on merit.

2. **"How is this different from Yearn/Beefy?"** — Agents compete via an open
   marketplace. Reasoning is verifiable via TEE. ERC-8004 gives portable,
   on-chain reputation. Intent-based architecture with solver competition.

3. **"What about MEV?"** — Solver auction creates competitive execution. Tight
   slippage from fresh quotes. 30-second validity windows. Mantle L2 has
   minimal MEV surface.

4. **"Is the TEE actually secure?"** — Phala Network TEE with on-chain
   attestation verification. The TEEAttestationVerifier contract checks Intel
   SGX quotes. Reasoning hashes are committed before execution.

5. **"What happens if an analyst goes rogue?"** — Reputation floor at -1000,
   automatic slashing, guard agent blocks high-risk operations, circuit breaker
   halts the vault if loss thresholds are hit.

6. **"Why Boltzmann exploration?"** — Prevents winner-take-all dynamics.
   Temperature-controlled randomness gives new entrants a fair chance while
   still favoring proven performers.

7. **"Token utility?"** — veABNK lock for governance, gauge voting directs
   analyst incentives to vaults, fee distribution to lockers, staking
   requirements for solvers and validators.
