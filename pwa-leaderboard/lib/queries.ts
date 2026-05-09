import { gql } from '@apollo/client';

// ─── Agent Queries ──────────────────────────────────────────────────────────

export const GET_AGENTS = gql`
  query GetAgents($first: Int!, $skip: Int!, $orderBy: String!) {
    agents(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: desc) {
      id
      name
      owner
      reputation
      totalOperations
      successfulOperations
      failedOperations
      totalValueManaged
      stakedAmount
      tier
      status
      registeredAt
      lastActiveAt
    }
  }
`;

export const GET_AGENT_DETAIL = gql`
  query GetAgentDetail($id: ID!) {
    agent(id: $id) {
      id
      name
      owner
      reputation
      totalOperations
      successfulOperations
      failedOperations
      totalValueManaged
      stakedAmount
      tier
      status
      registeredAt
      lastActiveAt
      operations(first: 20, orderBy: executedAt, orderDirection: desc) {
        id
        action
        protocol
        amount
        status
        executedAt
        txHash
      }
    }
  }
`;

// ─── Operations Queries ─────────────────────────────────────────────────────

export const GET_OPERATIONS = gql`
  query GetOperations($first: Int!, $skip: Int!, $status: String) {
    operations(
      first: $first
      skip: $skip
      orderBy: executedAt
      orderDirection: desc
      where: { status: $status }
    ) {
      id
      agent {
        id
        name
      }
      action
      protocol
      amount
      status
      pnl
      executedAt
      txHash
    }
  }
`;

export const GET_OPERATIONS_FEED = gql`
  query GetOperationsFeed($since: BigInt!) {
    operations(
      first: 50
      orderBy: executedAt
      orderDirection: desc
      where: { executedAt_gte: $since }
    ) {
      id
      agent {
        id
        name
      }
      action
      protocol
      amount
      status
      executedAt
      txHash
    }
  }
`;

// ─── Vault Queries ──────────────────────────────────────────────────────────

export const GET_VAULTS = gql`
  query GetVaults {
    vaults {
      id
      tier
      totalDeposited
      totalShares
      currentApy
      maxDrawdown
      realizedDrawdown
      activeAgents
      depositorCount
      lastRebalanceAt
    }
  }
`;

export const GET_VAULT_HISTORY = gql`
  query GetVaultHistory($vaultId: ID!, $days: Int!) {
    vaultSnapshots(
      first: $days
      orderBy: timestamp
      orderDirection: desc
      where: { vault: $vaultId }
    ) {
      id
      timestamp
      totalValue
      apy
      drawdown
      sharePrice
    }
  }
`;

// ─── LLM Leaderboard Queries ────────────────────────────────────────────────

export const GET_LLM_LEADERBOARD = gql`
  query GetLLMLeaderboard {
    llmModels(orderBy: avgReputation, orderDirection: desc) {
      id
      modelName
      agentCount
      avgReputation
      totalOpsManaged
      avgSuccessRate
      totalValueManaged
    }
  }
`;

// ─── Governance Queries ─────────────────────────────────────────────────────

export const GET_GAUGES = gql`
  query GetGauges {
    gauges {
      id
      name
      currentWeight
      totalVeAbnkVoted
      voterCount
      epoch
    }
  }
`;

export const GET_RECENT_VOTES = gql`
  query GetRecentVotes($first: Int!) {
    gaugeVotes(first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      voter
      gauge {
        id
        name
      }
      weight
      veAbnkAmount
      timestamp
    }
  }
`;

// ─── Protocol Stats ─────────────────────────────────────────────────────────

export const GET_PROTOCOL_STATS = gql`
  query GetProtocolStats {
    protocolStat(id: "global") {
      totalValueLocked
      totalAgents
      totalOperations
      totalDepositors
      operationsLast24h
      avgApy
    }
  }
`;
