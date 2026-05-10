'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

type SortKey = 'reputation' | 'stake' | 'feesEarned' | 'winRate' | 'totalSignals';
type SortDir = 'asc' | 'desc';

interface Analyst {
  id: string;
  address: string;
  displayName: string;
  stake: number;
  feesEarned: number;
  winRate: number;
  totalSignals: number;
  reputation: number;
  joinedAgo: string;
}

const MOCK_ANALYSTS: Analyst[] = [
  { id: '1', address: '0x1a2b...f3e4', displayName: 'SigmaTrader', stake: 125000, feesEarned: 34200, winRate: 94.2, totalSignals: 842, reputation: 9720, joinedAgo: '6 months' },
  { id: '2', address: '0x5c6d...a7b8', displayName: 'AlphaSeeker', stake: 98000, feesEarned: 28750, winRate: 91.8, totalSignals: 631, reputation: 9410, joinedAgo: '4 months' },
  { id: '3', address: '0x9e0f...1c2d', displayName: 'YieldWhale', stake: 250000, feesEarned: 61400, winRate: 88.5, totalSignals: 1204, reputation: 9180, joinedAgo: '8 months' },
  { id: '4', address: '0x3a4b...5e6f', displayName: 'DegenResearch', stake: 45000, feesEarned: 12800, winRate: 86.3, totalSignals: 389, reputation: 8640, joinedAgo: '3 months' },
  { id: '5', address: '0x7g8h...9i0j', displayName: 'MantleMaxi', stake: 180000, feesEarned: 42100, winRate: 92.7, totalSignals: 756, reputation: 8950, joinedAgo: '5 months' },
  { id: '6', address: '0xab12...cd34', displayName: 'DeltaNeutral', stake: 72000, feesEarned: 19300, winRate: 89.1, totalSignals: 512, reputation: 8420, joinedAgo: '7 months' },
  { id: '7', address: '0xef56...7890', displayName: 'QuantSigma', stake: 310000, feesEarned: 78500, winRate: 96.4, totalSignals: 1580, reputation: 9890, joinedAgo: '10 months' },
  { id: '8', address: '0x1234...abcd', displayName: 'OnChainOracle', stake: 55000, feesEarned: 8400, winRate: 79.6, totalSignals: 247, reputation: 7210, joinedAgo: '2 months' },
  { id: '9', address: '0x5678...efgh', displayName: 'VaultHunter', stake: 88000, feesEarned: 22600, winRate: 90.3, totalSignals: 680, reputation: 8780, joinedAgo: '6 months' },
  { id: '10', address: '0x9abc...ijkl', displayName: 'RiskParity', stake: 142000, feesEarned: 38900, winRate: 93.1, totalSignals: 920, reputation: 9350, joinedAgo: '9 months' },
];

// Simulates a GraphQL-style fetch
async function fetchAnalysts(): Promise<Analyst[]> {
  await new Promise((r) => setTimeout(r, 400));
  // In production: graphql(`{ analysts { id address displayName stake feesEarned winRate totalSignals reputation } }`)
  return MOCK_ANALYSTS;
}

export default function AnalystsPage() {
  const [sortKey, setSortKey] = useState<SortKey>('reputation');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data: analysts, isLoading } = useQuery({
    queryKey: ['analysts'],
    queryFn: fetchAnalysts,
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = analysts
    ? [...analysts].sort((a, b) => {
        const diff = a[sortKey] - b[sortKey];
        return sortDir === 'desc' ? -diff : diff;
      })
    : [];

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'desc' ? ' \u2193' : ' \u2191') : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analyst Marketplace</h1>
        <p className="text-gray-400 mt-1">
          Independent analysts stake tokens to publish signals. Reputation is earned through verified performance.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <span className="stat-label">Total Analysts</span>
          <span className="stat-value">{analysts?.length ?? '--'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Staked</span>
          <span className="stat-value text-brand-400">
            ${analysts ? (analysts.reduce((s, a) => s + a.stake, 0) / 1000).toFixed(0) + 'K' : '--'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Fees Earned</span>
          <span className="stat-value text-emerald-400">
            ${analysts ? (analysts.reduce((s, a) => s + a.feesEarned, 0) / 1000).toFixed(0) + 'K' : '--'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Avg Win Rate</span>
          <span className="stat-value">
            {analysts ? (analysts.reduce((s, a) => s + a.winRate, 0) / analysts.length).toFixed(1) + '%' : '--'}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="table-container overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr>
              <th className="table-header">#</th>
              <th className="table-header">Analyst</th>
              <th className="table-header cursor-pointer select-none" onClick={() => handleSort('stake')}>
                Stake{sortIndicator('stake')}
              </th>
              <th className="table-header cursor-pointer select-none" onClick={() => handleSort('feesEarned')}>
                Fees Earned{sortIndicator('feesEarned')}
              </th>
              <th className="table-header cursor-pointer select-none" onClick={() => handleSort('winRate')}>
                Win Rate{sortIndicator('winRate')}
              </th>
              <th className="table-header cursor-pointer select-none" onClick={() => handleSort('totalSignals')}>
                Total Signals{sortIndicator('totalSignals')}
              </th>
              <th className="table-header cursor-pointer select-none" onClick={() => handleSort('reputation')}>
                Reputation{sortIndicator('reputation')}
              </th>
              <th className="table-header">Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="table-row">
                  <td colSpan={8} className="table-cell">
                    <div className="h-4 bg-white/5 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : (
              sorted.map((analyst, idx) => (
                <tr key={analyst.id} className="table-row">
                  <td className="table-cell font-mono text-gray-500">{idx + 1}</td>
                  <td className="table-cell">
                    <div>
                      <span className="font-medium">{analyst.displayName}</span>
                      <span className="block text-xs font-mono text-gray-500">{analyst.address}</span>
                    </div>
                  </td>
                  <td className="table-cell font-mono">${analyst.stake.toLocaleString()}</td>
                  <td className="table-cell font-mono text-emerald-400">${analyst.feesEarned.toLocaleString()}</td>
                  <td className="table-cell">
                    <span className={analyst.winRate >= 90 ? 'text-emerald-400' : analyst.winRate >= 80 ? 'text-yellow-400' : 'text-red-400'}>
                      {analyst.winRate}%
                    </span>
                  </td>
                  <td className="table-cell font-mono">{analyst.totalSignals.toLocaleString()}</td>
                  <td className="table-cell font-mono text-brand-400">{analyst.reputation.toLocaleString()}</td>
                  <td className="table-cell text-xs text-gray-500">{analyst.joinedAgo}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
