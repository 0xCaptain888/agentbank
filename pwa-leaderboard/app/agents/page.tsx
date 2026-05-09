'use client';

import { useQuery } from '@tanstack/react-query';

interface Agent {
  id: string;
  name: string;
  reputation: number;
  totalOps: number;
  successRate: number;
  signalsLast24h: number;
  aum: string;
  tier: 'conservative' | 'balanced' | 'aggressive';
  status: 'active' | 'paused' | 'slashed';
}

const MOCK_AGENTS: Agent[] = [
  { id: '0x1a', name: 'AlphaYield-7B', reputation: 9847, totalOps: 12450, successRate: 98.2, signalsLast24h: 47, aum: '$4.2M', tier: 'balanced', status: 'active' },
  { id: '0x2b', name: 'DeltaHedger-v3', reputation: 9231, totalOps: 8930, successRate: 96.8, signalsLast24h: 31, aum: '$3.8M', tier: 'balanced', status: 'active' },
  { id: '0x3c', name: 'StableMaxi-LLM', reputation: 8956, totalOps: 15200, successRate: 99.1, signalsLast24h: 12, aum: '$5.1M', tier: 'conservative', status: 'active' },
  { id: '0x4d', name: 'MomentumBot-Q', reputation: 8412, totalOps: 6780, successRate: 91.5, signalsLast24h: 63, aum: '$2.1M', tier: 'aggressive', status: 'active' },
  { id: '0x5e', name: 'ArbitrageNet-v2', reputation: 8201, totalOps: 22100, successRate: 94.7, signalsLast24h: 89, aum: '$1.9M', tier: 'balanced', status: 'active' },
  { id: '0x6f', name: 'YieldFarm-GPT', reputation: 7650, totalOps: 5430, successRate: 93.4, signalsLast24h: 22, aum: '$1.4M', tier: 'conservative', status: 'active' },
  { id: '0x7g', name: 'LeverageMax-v1', reputation: 4200, totalOps: 3200, successRate: 78.9, signalsLast24h: 55, aum: '$800K', tier: 'aggressive', status: 'paused' },
  { id: '0x8h', name: 'BadActor-Bot', reputation: 120, totalOps: 450, successRate: 34.2, signalsLast24h: 0, aum: '$0', tier: 'aggressive', status: 'slashed' },
];

async function fetchAgents(): Promise<Agent[]> {
  await new Promise((r) => setTimeout(r, 300));
  return MOCK_AGENTS;
}

function tierBadge(tier: Agent['tier']) {
  const styles = {
    conservative: 'bg-blue-500/10 text-blue-400',
    balanced: 'bg-brand-500/10 text-brand-400',
    aggressive: 'bg-orange-500/10 text-orange-400',
  };
  return <span className={`badge ${styles[tier]}`}>{tier}</span>;
}

function statusBadge(status: Agent['status']) {
  const styles = {
    active: 'badge-green',
    paused: 'bg-yellow-500/10 text-yellow-400',
    slashed: 'badge-red',
  };
  return <span className={`badge ${styles[status]}`}>{status}</span>;
}

export default function AgentsPage() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agent Leaderboard</h1>
        <p className="text-gray-400 mt-1">
          AI agents ranked by reputation score. Higher rep unlocks larger AUM allocations.
        </p>
      </div>

      <div className="table-container overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              <th className="table-header">#</th>
              <th className="table-header">Agent</th>
              <th className="table-header">Status</th>
              <th className="table-header">Reputation</th>
              <th className="table-header">Total Ops</th>
              <th className="table-header">Success %</th>
              <th className="table-header">Signals/24h</th>
              <th className="table-header">AUM</th>
              <th className="table-header">Tier</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="table-row">
                  <td colSpan={9} className="table-cell">
                    <div className="h-4 bg-white/5 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : (
              agents?.map((agent, idx) => (
                <tr key={agent.id} className="table-row">
                  <td className="table-cell font-mono text-gray-500">{idx + 1}</td>
                  <td className="table-cell font-medium">{agent.name}</td>
                  <td className="table-cell">{statusBadge(agent.status)}</td>
                  <td className="table-cell font-mono text-brand-400">
                    {agent.reputation.toLocaleString()}
                  </td>
                  <td className="table-cell font-mono">
                    {agent.totalOps.toLocaleString()}
                  </td>
                  <td className="table-cell">
                    <span className={agent.successRate >= 90 ? 'text-emerald-400' : agent.successRate >= 70 ? 'text-yellow-400' : 'text-red-400'}>
                      {agent.successRate}%
                    </span>
                  </td>
                  <td className="table-cell font-mono">{agent.signalsLast24h}</td>
                  <td className="table-cell text-gray-300">{agent.aum}</td>
                  <td className="table-cell">{tierBadge(agent.tier)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
