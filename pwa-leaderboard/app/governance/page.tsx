'use client';

interface Gauge {
  id: string;
  name: string;
  description: string;
  currentWeight: number;
  veAbnkVoted: string;
  voters: number;
}

interface Vote {
  id: string;
  voter: string;
  gauge: string;
  weight: number;
  veAbnkAmount: string;
  timestamp: string;
}

const MOCK_GAUGES: Gauge[] = [
  { id: '1', name: 'Conservative Tier', description: 'Direct emissions to conservative vault agents', currentWeight: 35, veAbnkVoted: '4.2M', voters: 892 },
  { id: '2', name: 'Balanced Tier', description: 'Direct emissions to balanced vault agents', currentWeight: 42, veAbnkVoted: '5.1M', voters: 1_104 },
  { id: '3', name: 'Aggressive Tier', description: 'Direct emissions to aggressive vault agents', currentWeight: 15, veAbnkVoted: '1.8M', voters: 423 },
  { id: '4', name: 'Protocol Growth', description: 'Fund new integrations and partnerships', currentWeight: 8, veAbnkVoted: '960K', voters: 245 },
];

const MOCK_VOTES: Vote[] = [
  { id: '1', voter: '0x1a2b...3c4d', gauge: 'Balanced Tier', weight: 60, veAbnkAmount: '12,500', timestamp: '10 min ago' },
  { id: '2', voter: '0x5e6f...7g8h', gauge: 'Conservative Tier', weight: 100, veAbnkAmount: '45,000', timestamp: '25 min ago' },
  { id: '3', voter: '0x9i0j...1k2l', gauge: 'Aggressive Tier', weight: 40, veAbnkAmount: '8,200', timestamp: '1 hr ago' },
  { id: '4', voter: '0x3m4n...5o6p', gauge: 'Protocol Growth', weight: 30, veAbnkAmount: '5,100', timestamp: '2 hr ago' },
  { id: '5', voter: '0x7q8r...9s0t', gauge: 'Balanced Tier', weight: 80, veAbnkAmount: '22,000', timestamp: '3 hr ago' },
];

export default function GovernancePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Governance</h1>
        <p className="text-gray-400 mt-1">
          veABNK holders direct emissions to vault tiers via gauge voting. Lock ABNK for up to 4 years for maximum voting power.
        </p>
      </div>

      {/* Gauge Weights */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Active Gauges</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {MOCK_GAUGES.map((gauge) => (
            <div key={gauge.id} className="bg-surface-2 border border-white/5 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{gauge.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{gauge.description}</p>
                </div>
                <span className="text-xl font-bold text-brand-400">{gauge.currentWeight}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                  style={{ width: `${gauge.currentWeight}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{gauge.veAbnkVoted} veABNK</span>
                <span>{gauge.voters.toLocaleString()} voters</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Votes */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Votes</h2>
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Voter</th>
                <th className="table-header">Gauge</th>
                <th className="table-header">Weight</th>
                <th className="table-header">veABNK</th>
                <th className="table-header">Time</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_VOTES.map((vote) => (
                <tr key={vote.id} className="table-row">
                  <td className="table-cell font-mono text-sm text-gray-400">{vote.voter}</td>
                  <td className="table-cell font-medium text-sm">{vote.gauge}</td>
                  <td className="table-cell">
                    <span className="badge badge-purple">{vote.weight}%</span>
                  </td>
                  <td className="table-cell font-mono text-sm">{vote.veAbnkAmount}</td>
                  <td className="table-cell text-xs text-gray-500">{vote.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
