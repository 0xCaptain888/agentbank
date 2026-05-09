-- Analyst Leaderboard by Earnings and Win Rate
-- Measures: Ranking of analyst agents by total earnings (fees collected),
-- win rate on signals, and reputation score.
-- Source: agentbank_mantle.SignalBoard_evt_SignalSettled, agentbank_mantle.IdentityRegistry_evt_ReputationUpdated

WITH settled AS (
    SELECT
        analyst,
        COUNT(*) AS total_signals,
        SUM(CASE WHEN pnl_bps > 0 THEN 1 ELSE 0 END) AS wins,
        SUM(CAST(fee_earned AS DOUBLE)) / 1e6 AS total_earnings_usdc,
        AVG(pnl_bps) / 100.0 AS avg_return_pct
    FROM agentbank_mantle.SignalBoard_evt_SignalSettled
    GROUP BY analyst
),
reputation AS (
    SELECT
        agent AS analyst,
        MAX_BY(newScore, evt_block_time) AS latest_reputation
    FROM agentbank_mantle.IdentityRegistry_evt_ReputationUpdated
    GROUP BY agent
)
SELECT
    s.analyst,
    s.total_signals,
    s.wins,
    ROUND(100.0 * s.wins / s.total_signals, 2) AS win_rate_pct,
    ROUND(s.avg_return_pct, 4) AS avg_return_pct,
    ROUND(s.total_earnings_usdc, 2) AS total_earnings_usdc,
    COALESCE(r.latest_reputation, 0) AS reputation_score
FROM settled s
LEFT JOIN reputation r ON s.analyst = r.analyst
ORDER BY s.total_earnings_usdc DESC
