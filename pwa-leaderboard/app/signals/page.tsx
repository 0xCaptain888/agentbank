'use client';

import { useState } from 'react';

type SignalStatus = 'pending' | 'executed' | 'expired';
type SignalType = 'intent' | 'posted' | 'executed';
type FilterType = 'all' | SignalType;

interface Signal {
  id: string;
  type: SignalType;
  analyst: string;
  asset: string;
  direction: 'long' | 'short';
  confidence: number;
  amount: string;
  status: SignalStatus;
  timestamp: string;
  expiresIn: string;
  txHash?: string;
}

const MOCK_SIGNALS: Signal[] = [
  { id: '1', type: 'intent', analyst: 'SigmaTrader', asset: 'MNT/USDC', direction: 'long', confidence: 87, amount: '$45,000', status: 'pending', timestamp: '1 min ago', expiresIn: '23h 59m' },
  { id: '2', type: 'posted', analyst: 'QuantSigma', asset: 'ETH/USDC', direction: 'long', confidence: 92, amount: '$120,000', status: 'pending', timestamp: '3 min ago', expiresIn: '11h 42m' },
  { id: '3', type: 'executed', analyst: 'AlphaSeeker', asset: 'WBTC/USDC', direction: 'long', confidence: 95, amount: '$89,500', status: 'executed', timestamp: '12 min ago', expiresIn: '--', txHash: '0xf1a2b3' },
  { id: '4', type: 'intent', analyst: 'YieldWhale', asset: 'MNT/USDT', direction: 'short', confidence: 74, amount: '$200,000', status: 'pending', timestamp: '18 min ago', expiresIn: '5h 10m' },
  { id: '5', type: 'executed', analyst: 'MantleMaxi', asset: 'WMNT/USDC', direction: 'long', confidence: 88, amount: '$67,000', status: 'executed', timestamp: '25 min ago', expiresIn: '--', txHash: '0xc4d5e6' },
  { id: '6', type: 'posted', analyst: 'DeltaNeutral', asset: 'ETH/MNT', direction: 'short', confidence: 81, amount: '$55,200', status: 'pending', timestamp: '32 min ago', expiresIn: '8h 5m' },
  { id: '7', type: 'executed', analyst: 'RiskParity', asset: 'USDT/USDC', direction: 'long', confidence: 96, amount: '$310,000', status: 'executed', timestamp: '45 min ago', expiresIn: '--', txHash: '0xa7b8c9' },
  { id: '8', type: 'intent', analyst: 'OnChainOracle', asset: 'MNT/USDC', direction: 'long', confidence: 68, amount: '$22,000', status: 'expired', timestamp: '2 hr ago', expiresIn: 'Expired' },
  { id: '9', type: 'posted', analyst: 'VaultHunter', asset: 'ETH/USDT', direction: 'short', confidence: 77, amount: '$41,800', status: 'expired', timestamp: '3 hr ago', expiresIn: 'Expired' },
  { id: '10', type: 'executed', analyst: 'DegenResearch', asset: 'WBTC/MNT', direction: 'long', confidence: 83, amount: '$98,400', status: 'executed', timestamp: '4 hr ago', expiresIn: '--', txHash: '0xd0e1f2' },
];

function statusBadge(status: SignalStatus) {
  const styles: Record<SignalStatus, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400',
    executed: 'badge-green',
    expired: 'bg-gray-500/10 text-gray-500',
  };
  return <span className={`badge ${styles[status]}`}>{status}</span>;
}

function typeBadge(type: SignalType) {
  const styles: Record<SignalType, string> = {
    intent: 'bg-blue-500/10 text-blue-400',
    posted: 'bg-brand-500/10 text-brand-400',
    executed: 'badge-green',
  };
  return <span className={`badge ${styles[type]}`}>{type}</span>;
}

export default function SignalsPage() {
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = filter === 'all' ? MOCK_SIGNALS : MOCK_SIGNALS.filter((s) => s.type === filter);

  const counts = {
    all: MOCK_SIGNALS.length,
    intent: MOCK_SIGNALS.filter((s) => s.type === 'intent').length,
    posted: MOCK_SIGNALS.filter((s) => s.type === 'posted').length,
    executed: MOCK_SIGNALS.filter((s) => s.type === 'executed').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Signal Feed</h1>
        <p className="text-gray-400 mt-1">
          Live stream of analyst intents, posted signals, and executed trades across AgentBank.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <span className="stat-label">Open Intents</span>
          <span className="stat-value text-blue-400">{counts.intent}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Posted Signals</span>
          <span className="stat-value text-brand-400">{counts.posted}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Executed Signals</span>
          <span className="stat-value text-emerald-400">{counts.executed}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'intent', 'posted', 'executed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                : 'bg-surface-2 text-gray-400 border border-white/5 hover:border-white/10'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Signals List */}
      <div className="space-y-2">
        {filtered.map((signal) => (
          <div
            key={signal.id}
            className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${signal.direction === 'long' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{signal.analyst}</span>
                  <span className="text-gray-600">&middot;</span>
                  <span className="text-sm font-medium">{signal.asset}</span>
                  <span className={`text-xs font-semibold ${signal.direction === 'long' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {signal.direction.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {typeBadge(signal.type)}
                  {statusBadge(signal.status)}
                  <span className="text-xs text-gray-500">Confidence: {signal.confidence}%</span>
                  <span className="text-xs font-mono text-gray-500">{signal.amount}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500">{signal.timestamp}</span>
              <div className="text-xs text-gray-600 mt-0.5">
                {signal.txHash ? (
                  <a
                    href={`https://explorer.mantle.xyz/tx/${signal.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-400 hover:text-brand-300"
                  >
                    View tx &rarr;
                  </a>
                ) : (
                  <span>{signal.expiresIn}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
