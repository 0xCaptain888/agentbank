'use client';

import { useState } from 'react';

type OpStatus = 'success' | 'pending' | 'failed';

interface Operation {
  id: string;
  agent: string;
  action: string;
  protocol: string;
  amount: string;
  timestamp: string;
  status: OpStatus;
  txHash: string;
}

const MOCK_OPS: Operation[] = [
  { id: '1', agent: 'AlphaYield-7B', action: 'Rebalanced LP', protocol: 'Agni Finance', amount: '$124,500', timestamp: '2 min ago', status: 'success', txHash: '0xabc1' },
  { id: '2', agent: 'DeltaHedger-v3', action: 'Opened short hedge', protocol: 'iZUMi', amount: '$89,200', timestamp: '5 min ago', status: 'success', txHash: '0xabc2' },
  { id: '3', agent: 'MomentumBot-Q', action: 'Harvested & compounded', protocol: 'Lendle', amount: '$12,340', timestamp: '8 min ago', status: 'success', txHash: '0xabc3' },
  { id: '4', agent: 'StableMaxi-LLM', action: 'Deposited to lending', protocol: 'Lendle', amount: '$500,000', timestamp: '12 min ago', status: 'success', txHash: '0xabc4' },
  { id: '5', agent: 'ArbitrageNet-v2', action: 'Cross-pool arb', protocol: 'Agni/Merchant Moe', amount: '$45,600', timestamp: '15 min ago', status: 'success', txHash: '0xabc5' },
  { id: '6', agent: 'LeverageMax-v1', action: 'Leverage long ETH', protocol: 'Aurelius', amount: '$200,000', timestamp: '22 min ago', status: 'failed', txHash: '0xabc6' },
  { id: '7', agent: 'YieldFarm-GPT', action: 'Migrated LP position', protocol: 'Merchant Moe', amount: '$78,900', timestamp: '30 min ago', status: 'success', txHash: '0xabc7' },
  { id: '8', agent: 'AlphaYield-7B', action: 'Adjusted range order', protocol: 'Agni Finance', amount: '$310,000', timestamp: '45 min ago', status: 'success', txHash: '0xabc8' },
];

function statusIndicator(status: OpStatus) {
  const styles = {
    success: 'bg-emerald-400',
    pending: 'bg-yellow-400 animate-pulse',
    failed: 'bg-red-400',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${styles[status]}`} />;
}

export default function OperationsPage() {
  const [filter, setFilter] = useState<'all' | OpStatus>('all');

  const filtered = filter === 'all' ? MOCK_OPS : MOCK_OPS.filter((op) => op.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operations Feed</h1>
        <p className="text-gray-400 mt-1">
          Real-time stream of agent operations across Mantle DeFi protocols.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'success', 'pending', 'failed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                : 'bg-surface-2 text-gray-400 border border-white/5 hover:border-white/10'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Operations List */}
      <div className="space-y-2">
        {filtered.map((op) => (
          <div
            key={op.id}
            className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              {statusIndicator(op.status)}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{op.agent}</span>
                  <span className="text-gray-600">&middot;</span>
                  <span className="text-sm text-gray-400">{op.action}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{op.protocol}</span>
                  <span className="text-xs text-gray-600">&middot;</span>
                  <span className="text-xs font-mono text-gray-500">{op.amount}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500">{op.timestamp}</span>
              <div>
                <a
                  href={`https://explorer.mantle.xyz/tx/${op.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-400 hover:text-brand-300"
                >
                  View tx &rarr;
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
