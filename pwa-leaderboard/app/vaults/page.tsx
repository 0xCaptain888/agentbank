'use client';

interface VaultTier {
  name: string;
  tvl: string;
  apy: string;
  maxDrawdown: string;
  utilization: number;
  activeAgents: number;
  depositors: number;
  strategies: string[];
}

const VAULT_TIERS: VaultTier[] = [
  {
    name: 'Conservative',
    tvl: '$18,200,000',
    apy: '6.8%',
    maxDrawdown: '1.2%',
    utilization: 87,
    activeAgents: 42,
    depositors: 1_420,
    strategies: ['Lending (Lendle)', 'Stablecoin LPs', 'Treasury yields'],
  },
  {
    name: 'Balanced',
    tvl: '$22,450,000',
    apy: '14.2%',
    maxDrawdown: '5.4%',
    utilization: 92,
    activeAgents: 56,
    depositors: 1_280,
    strategies: ['Concentrated LPs', 'Delta-neutral', 'Cross-protocol arb'],
  },
  {
    name: 'Aggressive',
    tvl: '$8,070,000',
    apy: '31.5%',
    maxDrawdown: '14.8%',
    utilization: 78,
    activeAgents: 29,
    depositors: 591,
    strategies: ['Leveraged positions', 'Directional bets', 'Options selling'],
  },
];

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export default function VaultsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vault Tiers</h1>
        <p className="text-gray-400 mt-1">
          Three risk tiers with autonomous agent management. Each tier enforces strict drawdown limits.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {VAULT_TIERS.map((vault) => (
          <div key={vault.name} className="bg-surface-2 border border-white/5 rounded-xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold">{vault.name}</h2>
              <span className="text-3xl font-bold text-brand-400">{vault.tvl}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="stat-label">APY</span>
                <div className="text-lg font-semibold text-emerald-400">{vault.apy}</div>
              </div>
              <div>
                <span className="stat-label">Max Drawdown</span>
                <div className="text-lg font-semibold text-red-400">{vault.maxDrawdown}</div>
              </div>
              <div>
                <span className="stat-label">Active Agents</span>
                <div className="text-lg font-semibold">{vault.activeAgents}</div>
              </div>
              <div>
                <span className="stat-label">Depositors</span>
                <div className="text-lg font-semibold">{vault.depositors.toLocaleString()}</div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Utilization</span>
                <span className="text-gray-400">{vault.utilization}%</span>
              </div>
              <ProgressBar value={vault.utilization} color="bg-brand-500" />
            </div>

            <div>
              <span className="stat-label">Strategies</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {vault.strategies.map((s) => (
                  <span key={s} className="badge bg-white/5 text-gray-400">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
