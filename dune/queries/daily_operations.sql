-- Daily Operations: Executed vs Blocked
-- Measures: Number of agent operations executed successfully each day
-- versus operations blocked by the guardian/risk module.
-- Source: agentbank_mantle.AgentExecutor_evt_OperationExecuted / _evt_OperationBlocked

SELECT
    DATE_TRUNC('day', evt_block_time) AS day,
    COUNT(*) FILTER (WHERE status = 'executed') AS ops_executed,
    COUNT(*) FILTER (WHERE status = 'blocked') AS ops_blocked,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE status = 'executed') / NULLIF(COUNT(*), 0),
        2
    ) AS execution_rate_pct
FROM (
    SELECT evt_block_time, 'executed' AS status
    FROM agentbank_mantle.AgentExecutor_evt_OperationExecuted

    UNION ALL

    SELECT evt_block_time, 'blocked' AS status
    FROM agentbank_mantle.AgentExecutor_evt_OperationBlocked
) combined
GROUP BY 1
ORDER BY 1 DESC
