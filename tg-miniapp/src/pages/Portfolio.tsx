import { useQuery } from '@tanstack/react-query';

interface VaultPosition {
  tier: string;
  shares: string;
  depositedValue: string;
  currentValue: string;
  pnl: string;
  pnlPercent: string;
  apy: string;
}

interface PortfolioData {
  totalValue: string;
  totalPnl: string;
  totalPnlPercent: string;
  positions: VaultPosition[];
}

// Mock data - replace with on-chain reads
async function fetchPortfolio(): Promise<PortfolioData> {
  await new Promise((r) => setTimeout(r, 500));
  return {
    totalValue: '12,450.32',
    totalPnl: '+1,450.32',
    totalPnlPercent: '+13.2%',
    positions: [
      {
        tier: 'Conservative',
        shares: '5,000.00',
        depositedValue: '5,000.00',
        currentValue: '5,312.50',
        pnl: '+312.50',
        pnlPercent: '+6.25%',
        apy: '7.2%',
      },
      {
        tier: 'Balanced',
        shares: '4,000.00',
        depositedValue: '4,000.00',
        currentValue: '4,620.00',
        pnl: '+620.00',
        pnlPercent: '+15.5%',
        apy: '14.8%',
      },
      {
        tier: 'Aggressive',
        shares: '2,000.00',
        depositedValue: '2,000.00',
        currentValue: '2,517.82',
        pnl: '+517.82',
        pnlPercent: '+25.9%',
        apy: '32.1%',
      },
    ],
  };
}

export default function Portfolio() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio'],
    queryFn: fetchPortfolio,
  });

  if (isLoading) {
    return (
      <div className="page">
        <h1>Portfolio</h1>
        <div className="loading-skeleton">
          <div className="skeleton-block large" />
          <div className="skeleton-block" />
          <div className="skeleton-block" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page">
        <h1>Portfolio</h1>
        <div className="card error-card">
          <p>Failed to load portfolio data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Portfolio</h1>

      {/* Total Value Card */}
      <div className="card hero-card">
        <span className="hero-label">Total Value</span>
        <span className="hero-value">${data.totalValue}</span>
        <span className={`hero-pnl ${data.totalPnl.startsWith('+') ? 'positive' : 'negative'}`}>
          {data.totalPnl} ({data.totalPnlPercent})
        </span>
      </div>

      {/* Positions */}
      <div className="card">
        <h3>Your Positions</h3>
        <div className="positions-list">
          {data.positions.map((pos) => (
            <div key={pos.tier} className="position-item">
              <div className="position-header">
                <span className="position-tier">{pos.tier}</span>
                <span className="position-apy">{pos.apy} APY</span>
              </div>
              <div className="position-body">
                <div className="position-stat">
                  <span className="stat-label">Value</span>
                  <span className="stat-value">${pos.currentValue}</span>
                </div>
                <div className="position-stat">
                  <span className="stat-label">PnL</span>
                  <span className={`stat-value ${pos.pnl.startsWith('+') ? 'positive' : 'negative'}`}>
                    {pos.pnl} ({pos.pnlPercent})
                  </span>
                </div>
                <div className="position-stat">
                  <span className="stat-label">Shares</span>
                  <span className="stat-value">{pos.shares}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
