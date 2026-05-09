-- LLM Model Head-to-Head Comparison
-- Measures: Performance of each LLM model used by analyst agents,
-- comparing signal accuracy, average return, and total signals submitted.
-- Source: agentbank_mantle.SignalBoard_evt_SignalSubmitted / _evt_SignalSettled

WITH signals AS (
    SELECT
        s.signalId,
        s.model AS llm_model,
        s.analyst,
        s.direction,
        s.evt_block_time AS submitted_at,
        r.pnl_bps,
        CASE WHEN r.pnl_bps > 0 THEN 1 ELSE 0 END AS is_win
    FROM agentbank_mantle.SignalBoard_evt_SignalSubmitted s
    LEFT JOIN agentbank_mantle.SignalBoard_evt_SignalSettled r
        ON s.signalId = r.signalId
    WHERE r.signalId IS NOT NULL  -- only settled signals
)
SELECT
    llm_model,
    COUNT(*) AS total_signals,
    SUM(is_win) AS wins,
    ROUND(100.0 * SUM(is_win) / COUNT(*), 2) AS win_rate_pct,
    ROUND(AVG(pnl_bps) / 100.0, 4) AS avg_return_pct,
    SUM(pnl_bps) / 100.0 AS cumulative_return_pct
FROM signals
GROUP BY llm_model
ORDER BY win_rate_pct DESC, cumulative_return_pct DESC
