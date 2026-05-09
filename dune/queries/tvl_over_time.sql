-- TVL per Tier Over Time
-- Measures: Total Value Locked in each vault tier (Bronze, Silver, Gold, Diamond)
-- broken down by day. Uses deposit/withdraw events to compute running balances.
-- Source: agentbank_mantle.AgentBankVaultV2_evt_Deposit / _evt_Withdraw

WITH deposits AS (
    SELECT
        evt_block_time AS ts,
        tier,
        CAST(amount AS DOUBLE) / 1e6 AS amount_usdc
    FROM agentbank_mantle.AgentBankVaultV2_evt_Deposit
),
withdrawals AS (
    SELECT
        evt_block_time AS ts,
        tier,
        -1.0 * CAST(amount AS DOUBLE) / 1e6 AS amount_usdc
    FROM agentbank_mantle.AgentBankVaultV2_evt_Withdraw
),
all_flows AS (
    SELECT * FROM deposits
    UNION ALL
    SELECT * FROM withdrawals
),
daily_net AS (
    SELECT
        DATE_TRUNC('day', ts) AS day,
        tier,
        SUM(amount_usdc) AS net_flow
    FROM all_flows
    GROUP BY 1, 2
)
SELECT
    day,
    tier,
    SUM(net_flow) OVER (PARTITION BY tier ORDER BY day) AS tvl_usdc
FROM daily_net
ORDER BY day DESC, tier
