-- ABNK Token Holder Distribution
-- Measures: Distribution of ABNK token holdings across wallet tiers,
-- showing concentration and decentralization metrics.
-- Source: agentbank_mantle.ABNK_evt_Transfer (ERC-20 transfer events)

WITH transfers AS (
    SELECT
        "to" AS address,
        CAST(value AS DOUBLE) / 1e18 AS amount
    FROM agentbank_mantle.ABNK_evt_Transfer

    UNION ALL

    SELECT
        "from" AS address,
        -1.0 * CAST(value AS DOUBLE) / 1e18 AS amount
    FROM agentbank_mantle.ABNK_evt_Transfer
    WHERE "from" != 0x0000000000000000000000000000000000000000
),
balances AS (
    SELECT
        address,
        SUM(amount) AS balance
    FROM transfers
    WHERE address != 0x0000000000000000000000000000000000000000
    GROUP BY address
    HAVING SUM(amount) > 0
),
categorized AS (
    SELECT
        address,
        balance,
        CASE
            WHEN balance >= 1000000 THEN 'Whale (1M+)'
            WHEN balance >= 100000 THEN 'Large (100K-1M)'
            WHEN balance >= 10000 THEN 'Medium (10K-100K)'
            WHEN balance >= 1000 THEN 'Small (1K-10K)'
            ELSE 'Micro (<1K)'
        END AS holder_tier
    FROM balances
)
SELECT
    holder_tier,
    COUNT(*) AS num_holders,
    ROUND(SUM(balance), 2) AS total_balance,
    ROUND(AVG(balance), 2) AS avg_balance,
    ROUND(100.0 * SUM(balance) / (SELECT SUM(balance) FROM balances), 2) AS pct_of_supply
FROM categorized
GROUP BY holder_tier
ORDER BY total_balance DESC
