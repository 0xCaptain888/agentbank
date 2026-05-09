-- Cross-Chain Deposit Volume
-- Measures: Inbound deposit volume bridged from other chains into
-- AgentBank vaults on Mantle, broken down by source chain and day.
-- Source: agentbank_mantle.BridgeReceiver_evt_CrossChainDeposit

SELECT
    DATE_TRUNC('day', evt_block_time) AS day,
    source_chain_id,
    CASE source_chain_id
        WHEN 1 THEN 'Ethereum'
        WHEN 56 THEN 'BNB Chain'
        WHEN 137 THEN 'Polygon'
        WHEN 42161 THEN 'Arbitrum'
        WHEN 10 THEN 'Optimism'
        WHEN 8453 THEN 'Base'
        WHEN 43114 THEN 'Avalanche'
        ELSE CONCAT('Chain ', CAST(source_chain_id AS VARCHAR))
    END AS source_chain_name,
    COUNT(*) AS num_deposits,
    SUM(CAST(amount AS DOUBLE)) / 1e6 AS total_volume_usdc,
    COUNT(DISTINCT depositor) AS unique_depositors
FROM agentbank_mantle.BridgeReceiver_evt_CrossChainDeposit
GROUP BY 1, 2
ORDER BY 1 DESC, total_volume_usdc DESC
