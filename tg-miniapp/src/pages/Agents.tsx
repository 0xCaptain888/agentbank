import { useQuery } from '@tanstack/react-query';

type AgentStatus = 'active' | 'paused';
type AgentType = 'yield' | 'hedge' | 'arbitrage' | 'lending' | 'momentum';

interface AgentInfo {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  reputation: number;
  lastAction: string;
}

const MOCK_AGENTS: AgentInfo[] = [
  { id: '1', name: 'AlphaYield-7B', type: 'yield', status: 'active', reputation: 9847, lastAction: '2 min ago' },
  { id: '2', name: 'DeltaHedger-v3', type: 'hedge', status: 'active', reputation: 9231, lastAction: '5 min ago' },
  { id: '3', name: 'ArbitrageNet-v2', type: 'arbitrage', status: 'active', reputation: 8201, lastAction: '12 min ago' },
  { id: '4', name: 'StableMaxi-LLM', type: 'lending', status: 'paused', reputation: 8956, lastAction: '1 hr ago' },
  { id: '5', name: 'MomentumBot-Q', type: 'momentum', status: 'active', reputation: 8412, lastAction: '8 min ago' },
];

async function fetchAgents(): Promise<AgentInfo[]> {
  await new Promise((r) => setTimeout(r, 400));
  return MOCK_AGENTS;
}

function typeLabel(type: AgentType): string {
  const labels: Record<AgentType, string> = {
    yield: 'Yield Optimizer',
    hedge: 'Delta Hedger',
    arbitrage: 'Arbitrage',
    lending: 'Lending',
    momentum: 'Momentum',
  };
  return labels[type];
}

export default function Agents() {
  const { data: agents, isLoading, error } = useQuery({
    queryKey: ['tg-agents'],
    queryFn: fetchAgents,
  });

  if (isLoading) {
    return (
      <div className="page">
        <h1>Agents</h1>
        <div className="loading-skeleton">
          <div className="skeleton-block" />
          <div className="skeleton-block" />
          <div className="skeleton-block" />
        </div>
      </div>
    );
  }

  if (error || !agents) {
    return (
      <div className="page">
        <h1>Agents</h1>
        <div className="card error-card">
          <p>Failed to load agent data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Agents</h1>
      <p className="subtitle">AI agents managing your vault positions.</p>

      <div className="card">
        <div className="positions-list">
          {agents.map((agent) => (
            <div key={agent.id} className="position-item">
              <div className="position-header">
                <span className="position-tier">{agent.name}</span>
                <span
                  className={`position-apy ${agent.status === 'active' ? 'positive' : ''}`}
                  style={agent.status === 'paused' ? { color: '#facc15' } : undefined}
                >
                  {agent.status === 'active' ? 'Active' : 'Paused'}
                </span>
              </div>
              <div className="position-body">
                <div className="position-stat">
                  <span className="stat-label">Type</span>
                  <span className="stat-value">{typeLabel(agent.type)}</span>
                </div>
                <div className="position-stat">
                  <span className="stat-label">Reputation</span>
                  <span className="stat-value">{agent.reputation.toLocaleString()}</span>
                </div>
                <div className="position-stat">
                  <span className="stat-label">Last Action</span>
                  <span className="stat-value">{agent.lastAction}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
