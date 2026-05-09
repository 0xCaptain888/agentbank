# AgentBank Dune Analytics Dashboard (M31)

## Overview

The AgentBank Dune dashboard provides real-time protocol analytics for investors, analysts, and the core team. All queries target Mantle mainnet indexed data using AgentBank contract events.

**Dashboard URL:** `https://dune.com/agentbank/v3-mainnet`

---

## Panel Summary

| # | Panel | Type | Refresh |
|---|-------|------|---------|
| 1 | TVL Over Time | Area chart | 1h |
| 2 | Daily Ops: Executed vs Blocked | Dual bar chart | 1h |
| 3 | Top Signals by PnL | Table | 6h |
| 4 | Analyst Leaderboard | Table with sparklines | 6h |
| 5 | LLM Head-to-Head | Grouped bar chart | 24h |
| 6 | Insurance Claims | Table + counter | 1h |
| 7 | Cross-Chain Inflow | Stacked area | 1h |
| 8 | Token Holder Distribution | Pie chart | 24h |
| 9 | Gauge Votes | Horizontal bar | 24h |
| 10 | Signal Activity Heatmap | Calendar heatmap | 6h |

---

## SQL Queries

### Query 1: TVL Over Time

Tracks vault totalAssets over time via deposit and withdrawal events.

```sql
WITH deposits AS (
    SELECT
        evt_block_time AS ts,
        CAST(assets AS DOUBLE) / 1e6 AS amount_usd
    FROM agentbank_mantle.AgentBankVaultV2_evt_Deposit
),
withdrawals AS (
    SELECT
        evt_block_time AS ts,
        -1.0 * CAST(assets AS DOUBLE) / 1e6 AS amount_usd
    FROM agentbank_mantle.AgentBankVaultV2_evt_Withdraw
),
all_flows AS (
    SELECT * FROM deposits
    UNION ALL
    SELECT * FROM withdrawals
),
cumulative AS (
    SELECT
        DATE_TRUNC('hour', ts) AS hour,
        SUM(amount_usd) OVER (ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS tvl_usd
    FROM all_flows
)
SELECT
    hour,
    MAX(tvl_usd) AS tvl_usd
FROM cumulative
GROUP BY 1
ORDER BY 1
```

### Query 2: Daily Ops Executed vs Blocked

Compares successful strategy executions to circuit breaker blocks.

```sql
WITH executed AS (
    SELECT
        DATE_TRUNC('day', evt_block_time) AS day,
        COUNT(*) AS exec_count
    FROM agentbank_mantle.IntentRouter_evt_IntentExecuted
    GROUP BY 1
),
blocked AS (
    SELECT
        DATE_TRUNC('day', evt_block_time) AS day,
        COUNT(*) AS block_count
    FROM agentbank_mantle.CircuitBreaker_evt_Paused
    GROUP BY 1
),
rejected AS (
    SELECT
        DATE_TRUNC('day', evt_block_time) AS day,
        COUNT(*) AS reject_count
    FROM agentbank_mantle.IntentRouter_evt_IntentRejected
    GROUP BY 1
)
SELECT
    COALESCE(e.day, b.day, r.day) AS day,
    COALESCE(e.exec_count, 0) AS executed,
    COALESCE(b.block_count, 0) + COALESCE(r.reject_count, 0) AS blocked
FROM executed e
FULL OUTER JOIN blocked b ON e.day = b.day
FULL OUTER JOIN rejected r ON e.day = r.day
ORDER BY 1
```

### Query 3: Top Signals by PnL

Ranks signals by realized profit/loss after execution.

```sql
SELECT
    s.signalId,
    s.analyst,
    s.direction,
    s.asset,
    CAST(s.conviction AS DOUBLE) / 1e18 AS conviction,
    CAST(p.pnlBps AS INT) / 100.0 AS pnl_pct,
    CAST(p.pnlAbsolute AS DOUBLE) / 1e6 AS pnl_usd,
    s.evt_block_time AS submitted_at,
    p.evt_block_time AS settled_at
FROM agentbank_mantle.SignalBoardV2_evt_SignalSubmitted s
INNER JOIN agentbank_mantle.PerformanceTracker_evt_SignalSettled p
    ON s.signalId = p.signalId
ORDER BY pnl_usd DESC
LIMIT 50
```

### Query 4: Analyst Leaderboard

Ranks analysts by cumulative PnL with signal count and win rate.

```sql
WITH analyst_signals AS (
    SELECT
        s.analyst,
        COUNT(*) AS total_signals,
        SUM(CASE WHEN CAST(p.pnlBps AS INT) > 0 THEN 1 ELSE 0 END) AS wins,
        SUM(CAST(p.pnlAbsolute AS DOUBLE) / 1e6) AS total_pnl_usd,
        AVG(CAST(p.pnlBps AS INT)) / 100.0 AS avg_pnl_pct
    FROM agentbank_mantle.SignalBoardV2_evt_SignalSubmitted s
    INNER JOIN agentbank_mantle.PerformanceTracker_evt_SignalSettled p
        ON s.signalId = p.signalId
    GROUP BY 1
),
reputation AS (
    SELECT
        analyst,
        CAST(score AS DOUBLE) / 1e18 AS rep_score
    FROM agentbank_mantle.ReputationRegistry_evt_ScoreUpdated
    WHERE evt_block_time = (
        SELECT MAX(evt_block_time)
        FROM agentbank_mantle.ReputationRegistry_evt_ScoreUpdated sub
        WHERE sub.analyst = agentbank_mantle.ReputationRegistry_evt_ScoreUpdated.analyst
    )
)
SELECT
    a.analyst,
    a.total_signals,
    a.wins,
    ROUND(100.0 * a.wins / a.total_signals, 1) AS win_rate_pct,
    ROUND(a.total_pnl_usd, 2) AS cumulative_pnl_usd,
    ROUND(a.avg_pnl_pct, 2) AS avg_return_pct,
    COALESCE(r.rep_score, 0) AS reputation
FROM analyst_signals a
LEFT JOIN reputation r ON a.analyst = r.analyst
WHERE a.total_signals >= 5
ORDER BY a.total_pnl_usd DESC
LIMIT 25
```

### Query 5: LLM Head-to-Head

Compares performance of different LLM models used for signal generation.

```sql
WITH validated AS (
    SELECT
        v.signalId,
        v.modelId,
        v.provider,
        CAST(p.pnlBps AS INT) / 100.0 AS pnl_pct,
        CASE WHEN CAST(p.pnlBps AS INT) > 0 THEN 1 ELSE 0 END AS is_win
    FROM agentbank_mantle.ValidationRegistry_evt_InferenceValidated v
    INNER JOIN agentbank_mantle.PerformanceTracker_evt_SignalSettled p
        ON v.signalId = p.signalId
)
SELECT
    provider,
    modelId AS model,
    COUNT(*) AS total_signals,
    SUM(is_win) AS wins,
    ROUND(100.0 * SUM(is_win) / COUNT(*), 1) AS win_rate_pct,
    ROUND(AVG(pnl_pct), 2) AS avg_return_pct,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pnl_pct), 2) AS median_return_pct,
    MIN(pnl_pct) AS worst_signal_pct,
    MAX(pnl_pct) AS best_signal_pct
FROM validated
GROUP BY 1, 2
HAVING COUNT(*) >= 10
ORDER BY avg_return_pct DESC
```

### Query 6: Insurance Claims

Lists all insurance claim events with status and payout amounts.

```sql
SELECT
    evt_tx_hash,
    claimant,
    CAST(depositAmount AS DOUBLE) / 1e6 AS original_deposit_usd,
    CAST(claimAmount AS DOUBLE) / 1e6 AS claim_usd,
    CAST(payoutAmount AS DOUBLE) / 1e6 AS payout_usd,
    status,
    evt_block_time AS claimed_at,
    evt_block_number
FROM agentbank_mantle.InsurancePool_evt_ClaimProcessed
ORDER BY evt_block_time DESC
```

**Counter query (total claims paid):**

```sql
SELECT
    COUNT(*) AS total_claims,
    SUM(CAST(payoutAmount AS DOUBLE) / 1e6) AS total_paid_usd,
    AVG(CAST(payoutAmount AS DOUBLE) / 1e6) AS avg_claim_usd
FROM agentbank_mantle.InsurancePool_evt_ClaimProcessed
WHERE status = 'approved'
```

### Query 7: Cross-Chain Inflow

Tracks deposits arriving from other chains via LayerZero OFT bridge.

```sql
SELECT
    DATE_TRUNC('day', evt_block_time) AS day,
    srcChainId,
    CASE
        WHEN srcChainId = 101 THEN 'Ethereum'
        WHEN srcChainId = 110 THEN 'Arbitrum'
        WHEN srcChainId = 111 THEN 'Optimism'
        WHEN srcChainId = 184 THEN 'Base'
        WHEN srcChainId = 102 THEN 'BSC'
        ELSE CAST(srcChainId AS VARCHAR)
    END AS source_chain,
    COUNT(*) AS tx_count,
    SUM(CAST(amount AS DOUBLE) / 1e6) AS inflow_usd
FROM agentbank_mantle.CrossChainEntrypoint_evt_CrossChainDeposit
GROUP BY 1, 2
ORDER BY 1 DESC, inflow_usd DESC
```

### Query 8: Token Holder Distribution

Categorizes ABNK holders by tier.

```sql
WITH balances AS (
    SELECT
        "to" AS holder,
        SUM(CAST(value AS DOUBLE) / 1e18) AS received
    FROM agentbank_mantle.ABNKToken_evt_Transfer
    GROUP BY 1
),
sent AS (
    SELECT
        "from" AS holder,
        SUM(CAST(value AS DOUBLE) / 1e18) AS total_sent
    FROM agentbank_mantle.ABNKToken_evt_Transfer
    GROUP BY 1
),
net_balances AS (
    SELECT
        b.holder,
        COALESCE(b.received, 0) - COALESCE(s.total_sent, 0) AS balance
    FROM balances b
    LEFT JOIN sent s ON b.holder = s.holder
    WHERE COALESCE(b.received, 0) - COALESCE(s.total_sent, 0) > 0
      AND b.holder != 0x0000000000000000000000000000000000000000
)
SELECT
    CASE
        WHEN balance >= 1000000 THEN 'Whale (>=1M)'
        WHEN balance >= 100000 THEN 'Large (100k-1M)'
        WHEN balance >= 10000 THEN 'Medium (10k-100k)'
        WHEN balance >= 1000 THEN 'Small (1k-10k)'
        ELSE 'Micro (<1k)'
    END AS tier,
    COUNT(*) AS holders,
    SUM(balance) AS total_balance,
    ROUND(100.0 * SUM(balance) / (SELECT SUM(balance) FROM net_balances), 2) AS pct_supply
FROM net_balances
GROUP BY 1
ORDER BY total_balance DESC
```

### Query 9: Gauge Votes

Shows current gauge weight distribution across strategies.

```sql
WITH latest_epoch AS (
    SELECT MAX(epoch) AS current_epoch
    FROM agentbank_mantle.VotingEscrow_evt_GaugeVote
)
SELECT
    g.gauge AS strategy_address,
    COUNT(DISTINCT g.voter) AS unique_voters,
    SUM(CAST(g.weight AS DOUBLE) / 1e18) AS total_weight,
    ROUND(
        100.0 * SUM(CAST(g.weight AS DOUBLE) / 1e18) /
        NULLIF((SELECT SUM(CAST(weight AS DOUBLE) / 1e18)
                FROM agentbank_mantle.VotingEscrow_evt_GaugeVote
                WHERE epoch = (SELECT current_epoch FROM latest_epoch)), 0),
        2
    ) AS weight_pct
FROM agentbank_mantle.VotingEscrow_evt_GaugeVote g
CROSS JOIN latest_epoch le
WHERE g.epoch = le.current_epoch
GROUP BY 1
ORDER BY total_weight DESC
```

### Query 10: Signal Activity Heatmap

Daily signal submission counts for calendar heatmap visualization.

```sql
SELECT
    DATE_TRUNC('day', evt_block_time) AS day,
    EXTRACT(DOW FROM evt_block_time) AS day_of_week,
    EXTRACT(HOUR FROM evt_block_time) AS hour_of_day,
    COUNT(*) AS signal_count,
    SUM(CASE WHEN direction = 'LONG' THEN 1 ELSE 0 END) AS long_count,
    SUM(CASE WHEN direction = 'SHORT' THEN 1 ELSE 0 END) AS short_count,
    AVG(CAST(conviction AS DOUBLE) / 1e18) AS avg_conviction
FROM agentbank_mantle.SignalBoardV2_evt_SignalSubmitted
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 3
```

---

## Embedding Instructions

### Pitch Deck Integration

For investor pitch decks, embed live Dune charts using iframe URLs:

```html
<!-- TVL Chart for Slide 8 (Traction) -->
<iframe
  src="https://dune.com/embeds/QUERY_ID/VISUALIZATION_ID"
  width="1200"
  height="400"
  frameborder="0"
  style="border-radius: 8px;"
></iframe>
```

**Recommended panels for pitch deck:**
1. TVL Over Time (traction proof)
2. LLM Head-to-Head (technology differentiation)
3. Analyst Leaderboard (marketplace activity)
4. Cross-Chain Inflow (multi-chain narrative)

Export static PNG snapshots for PDF decks:
```bash
# Use Dune API to export chart as PNG
curl -X GET "https://api.dune.com/api/v1/query/QUERY_ID/results?format=png" \
  -H "X-Dune-API-Key: $DUNE_API_KEY" \
  -o charts/tvl_over_time.png
```

### PWA Leaderboard Integration

The `pwa-leaderboard/` app embeds Dune data via the Dune API:

```typescript
// pwa-leaderboard/src/hooks/useDuneQuery.ts
const DUNE_API = 'https://api.dune.com/api/v1';

export async function fetchDuneQuery(queryId: number): Promise<DuneResult> {
  const res = await fetch(`${DUNE_API}/query/${queryId}/results`, {
    headers: { 'X-Dune-API-Key': process.env.NEXT_PUBLIC_DUNE_KEY! }
  });
  return res.json();
}

// Query IDs (update after dashboard creation)
export const QUERIES = {
  TVL_OVER_TIME: 0,        // Replace with actual query ID
  ANALYST_LEADERBOARD: 0,
  LLM_COMPARISON: 0,
  SIGNAL_HEATMAP: 0,
};
```

**Caching strategy:**
- API results cached in IndexedDB with TTL matching panel refresh rates
- Fallback to cached data if Dune API is unavailable
- Background refresh using Service Worker

### Telegram Mini-App Integration

For the `tg-miniapp/`, use lightweight Dune embeds:

```javascript
// tg-miniapp/src/api/dune.js
const PANELS = {
  tvl: { queryId: 0, refreshMs: 3600000 },
  leaderboard: { queryId: 0, refreshMs: 21600000 },
};

export function getDuneEmbedUrl(panel) {
  return `https://dune.com/embeds/${PANELS[panel].queryId}/1`;
}
```

---

## Dashboard Maintenance

### Adding New Queries
1. Create query on Dune with `agentbank_` namespace prefix
2. Add visualization and pin to dashboard
3. Update query ID constants in PWA and mini-app
4. Test embed rendering at mobile and desktop breakpoints

### Monitoring
- Set up Dune alerts for: TVL drop > 10%, insurance claim events, circuit breaker triggers
- Weekly review of query performance (execution time < 30s target)
- Monthly audit of data accuracy against on-chain state
