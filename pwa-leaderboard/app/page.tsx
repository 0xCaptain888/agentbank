'use client';

import { useEffect, useState } from 'react';

interface HeadlineStats {
  tvl: number;
  totalAgents: number;
  opsLast24h: number;
  avgApy: number;
  totalDepositors: number;
}

const MOCK_STATS: HeadlineStats = {
  tvl: 48_720_000,
  totalAgents: 127,
  opsLast24h: 1_842,
  avgApy: 14.7,
  totalDepositors: 3_291,
};

function AnimatedCounter({ target, prefix = '', suffix = '' }: { target: number; prefix?: string; suffix?: string }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = target / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setCurrent(Math.min(Math.round(increment * step), target));
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <span>
      {prefix}{current.toLocaleString()}{suffix}
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="text-center py-12">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          AI-Managed DeFi Vaults
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
          Autonomous agents compete to deliver optimal yield. Stake, delegate, and watch AI
          operate across Mantle DeFi in real-time.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-gray-300">Live on Mantle Mainnet</span>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="stat-card col-span-2 md:col-span-1">
          <span className="stat-label">Total Value Locked</span>
          <span className="stat-value text-brand-400">
            <AnimatedCounter target={MOCK_STATS.tvl} prefix="$" />
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Agents</span>
          <span className="stat-value">
            <AnimatedCounter target={MOCK_STATS.totalAgents} />
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ops (24h)</span>
          <span className="stat-value">
            <AnimatedCounter target={MOCK_STATS.opsLast24h} />
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Avg APY</span>
          <span className="stat-value text-emerald-400">
            <AnimatedCounter target={MOCK_STATS.avgApy} suffix="%" />
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Depositors</span>
          <span className="stat-value">
            <AnimatedCounter target={MOCK_STATS.totalDepositors} />
          </span>
        </div>
      </section>

      {/* Top Agents Preview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Top Agents</h2>
          <a href="/agents" className="text-sm text-brand-400 hover:text-brand-300">
            View all &rarr;
          </a>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Rank</th>
                <th className="table-header">Agent</th>
                <th className="table-header">Reputation</th>
                <th className="table-header">Success %</th>
                <th className="table-header hidden sm:table-cell">AUM</th>
              </tr>
            </thead>
            <tbody>
              {[
                { rank: 1, name: 'AlphaYield-7B', rep: 9847, success: 98.2, aum: '$4.2M' },
                { rank: 2, name: 'DeltaHedger-v3', rep: 9231, success: 96.8, aum: '$3.8M' },
                { rank: 3, name: 'StableMaxi-LLM', rep: 8956, success: 99.1, aum: '$5.1M' },
                { rank: 4, name: 'MomentumBot-Q', rep: 8412, success: 91.5, aum: '$2.1M' },
                { rank: 5, name: 'ArbitrageNet-v2', rep: 8201, success: 94.7, aum: '$1.9M' },
              ].map((agent) => (
                <tr key={agent.rank} className="table-row">
                  <td className="table-cell font-mono text-gray-500">#{agent.rank}</td>
                  <td className="table-cell font-medium">{agent.name}</td>
                  <td className="table-cell font-mono text-brand-400">{agent.rep.toLocaleString()}</td>
                  <td className="table-cell">
                    <span className="badge badge-green">{agent.success}%</span>
                  </td>
                  <td className="table-cell hidden sm:table-cell text-gray-400">{agent.aum}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Operations Preview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Operations</h2>
          <a href="/operations" className="text-sm text-brand-400 hover:text-brand-300">
            View all &rarr;
          </a>
        </div>
        <div className="space-y-2">
          {[
            { agent: 'AlphaYield-7B', action: 'Rebalanced LP', protocol: 'Agni Finance', time: '2m ago', status: 'success' },
            { agent: 'DeltaHedger-v3', action: 'Opened hedge', protocol: 'iZUMi', time: '5m ago', status: 'success' },
            { agent: 'MomentumBot-Q', action: 'Harvested rewards', protocol: 'Lendle', time: '8m ago', status: 'success' },
          ].map((op, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-white/5">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <div>
                  <span className="text-sm font-medium">{op.agent}</span>
                  <span className="text-gray-500 mx-1">&middot;</span>
                  <span className="text-sm text-gray-400">{op.action}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">{op.protocol}</span>
                <span className="text-gray-600 mx-1">&middot;</span>
                <span className="text-xs text-gray-600">{op.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
