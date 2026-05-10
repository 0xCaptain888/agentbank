'use client';

import { useState } from 'react';

type SortKey = 'totalSignals' | 'totalPnl' | 'successRate' | 'avgConfidence' | 'pnl30d';

interface LlmModel {
  name: string;
  version: string;
  totalSignals: number;
  totalPnl: number;
  successRate: number;
  avgConfidence: number;
  pnl30d: number;
  color: string;
}

const MOCK_MODELS: LlmModel[] = [
  { name: 'DeepSeek', version: 'R1-0528', totalSignals: 4280, totalPnl: 892400, successRate: 94.2, avgConfidence: 88.7, pnl30d: 124500, color: 'bg-blue-500' },
  { name: 'Llama', version: '4-Maverick', totalSignals: 3150, totalPnl: 645200, successRate: 91.8, avgConfidence: 85.3, pnl30d: 87200, color: 'bg-purple-500' },
  { name: 'Qwen', version: '3-235B-A22B', totalSignals: 2890, totalPnl: 721800, successRate: 93.1, avgConfidence: 90.2, pnl30d: 102800, color: 'bg-orange-500' },
  { name: 'Allora', version: 'v2.1', totalSignals: 1920, totalPnl: 412600, successRate: 89.5, avgConfidence: 82.1, pnl30d: 56300, color: 'bg-emerald-500' },
];

function BarChart({ models, metric, label }: { models: LlmModel[]; metric: keyof LlmModel; label: string }) {
  const values = models.map((m) => Number(m[metric]));
  const max = Math.max(...values);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-400">{label}</h3>
      {models.map((model) => {
        const value = Number(model[metric]);
        const width = max > 0 ? (value / max) * 100 : 0;
        const formatted =
          metric === 'totalPnl' || metric === 'pnl30d'
            ? `$${value.toLocaleString()}`
            : metric === 'successRate' || metric === 'avgConfidence'
              ? `${value}%`
              : value.toLocaleString();

        return (
          <div key={model.name} className="flex items-center gap-3">
            <span className="text-xs font-medium w-20 text-gray-300 shrink-0">{model.name}</span>
            <div className="flex-1 h-6 rounded bg-white/5 overflow-hidden relative">
              <div
                className={`h-full rounded ${model.color} opacity-80 transition-all duration-700`}
                style={{ width: `${width}%` }}
              />
              <span className="absolute inset-y-0 right-2 flex items-center text-xs font-mono text-gray-300">
                {formatted}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LlmModelsPage() {
  const [sortKey, setSortKey] = useState<SortKey>('totalPnl');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...MOCK_MODELS].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortDir === 'desc' ? -diff : diff;
  });

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'desc' ? ' \u2193' : ' \u2191') : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LLM Model Rankings</h1>
        <p className="text-gray-400 mt-1">
          Comparing AI model performance by attributable PnL. Rankings update as agents execute operations.
        </p>
      </div>

      {/* Bar Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-surface-2 border border-white/5 rounded-xl p-5">
          <BarChart models={MOCK_MODELS} metric="totalPnl" label="Total Attributable PnL" />
        </div>
        <div className="bg-surface-2 border border-white/5 rounded-xl p-5">
          <BarChart models={MOCK_MODELS} metric="pnl30d" label="Last 30 Days PnL" />
        </div>
        <div className="bg-surface-2 border border-white/5 rounded-xl p-5">
          <BarChart models={MOCK_MODELS} metric="successRate" label="Success Rate" />
        </div>
        <div className="bg-surface-2 border border-white/5 rounded-xl p-5">
          <BarChart models={MOCK_MODELS} metric="avgConfidence" label="Average Confidence" />
        </div>
      </div>

      {/* Data Table */}
      <div className="table-container overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              <th className="table-header">#</th>
              <th className="table-header">Model</th>
              <th className="table-header cursor-pointer select-none" onClick={() => handleSort('totalSignals')}>
                Total Signals{sortIndicator('totalSignals')}
              </th>
              <th className="table-header cursor-pointer select-none" onClick={() => handleSort('totalPnl')}>
                Total PnL{sortIndicator('totalPnl')}
              </th>
              <th className="table-header cursor-pointer select-none" onClick={() => handleSort('successRate')}>
                Success Rate{sortIndicator('successRate')}
              </th>
              <th className="table-header cursor-pointer select-none" onClick={() => handleSort('avgConfidence')}>
                Avg Confidence{sortIndicator('avgConfidence')}
              </th>
              <th className="table-header cursor-pointer select-none" onClick={() => handleSort('pnl30d')}>
                30d PnL{sortIndicator('pnl30d')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((model, idx) => (
              <tr key={model.name} className="table-row">
                <td className="table-cell font-mono text-gray-500">{idx + 1}</td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${model.color}`} />
                    <div>
                      <span className="font-medium">{model.name}</span>
                      <span className="block text-xs text-gray-500">{model.version}</span>
                    </div>
                  </div>
                </td>
                <td className="table-cell font-mono">{model.totalSignals.toLocaleString()}</td>
                <td className="table-cell font-mono text-emerald-400">${model.totalPnl.toLocaleString()}</td>
                <td className="table-cell">
                  <span className={model.successRate >= 92 ? 'text-emerald-400' : model.successRate >= 88 ? 'text-yellow-400' : 'text-orange-400'}>
                    {model.successRate}%
                  </span>
                </td>
                <td className="table-cell font-mono">{model.avgConfidence}%</td>
                <td className="table-cell font-mono text-brand-400">${model.pnl30d.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
