import { useState, useCallback } from 'react';
import { showMainButton, hideMainButton, setMainButtonLoading, hapticFeedback } from '../lib/tg';
import { formatTokenAmount } from '../lib/chain';

type VaultTier = 'conservative' | 'balanced' | 'aggressive';

interface TierInfo {
  name: string;
  targetApy: string;
  maxDrawdown: string;
  description: string;
}

const TIERS: Record<VaultTier, TierInfo> = {
  conservative: {
    name: 'Conservative',
    targetApy: '5-8%',
    maxDrawdown: '2%',
    description: 'Low-risk strategies: lending, stablecoin LPs',
  },
  balanced: {
    name: 'Balanced',
    targetApy: '10-18%',
    maxDrawdown: '8%',
    description: 'Mixed strategies: concentrated LPs, delta-neutral',
  },
  aggressive: {
    name: 'Aggressive',
    targetApy: '20-40%+',
    maxDrawdown: '20%',
    description: 'High-risk: leveraged positions, directional bets',
  },
};

export default function Deposit() {
  const [amount, setAmount] = useState('');
  const [selectedTier, setSelectedTier] = useState<VaultTier>('balanced');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDeposit = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    setMainButtonLoading(true);
    hapticFeedback('impact');

    try {
      // TODO: integrate with vault contract
      await new Promise((resolve) => setTimeout(resolve, 2000));
      hapticFeedback('notification');
      alert(`Deposited ${amount} USDC into ${TIERS[selectedTier].name} vault`);
      setAmount('');
    } catch (err) {
      console.error('Deposit failed:', err);
    } finally {
      setIsSubmitting(false);
      setMainButtonLoading(false);
    }
  }, [amount, selectedTier]);

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      if (parseFloat(value) > 0) {
        showMainButton(`Deposit ${value} USDC`, handleDeposit);
      } else {
        hideMainButton();
      }
    }
  };

  return (
    <div className="page">
      <h1>Deposit</h1>
      <p className="subtitle">Deposit USDC into an AgentBank vault tier.</p>

      {/* Amount Input */}
      <div className="card">
        <label className="input-label">Amount (USDC)</label>
        <div className="amount-input-wrapper">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="amount-input"
            disabled={isSubmitting}
          />
          <button
            className="max-btn"
            onClick={() => handleAmountChange('1000')}
          >
            MAX
          </button>
        </div>
        <p className="balance-hint">Available: 1,000.00 USDC</p>
      </div>

      {/* Tier Selection */}
      <div className="card">
        <label className="input-label">Select Vault Tier</label>
        <div className="tier-grid">
          {(Object.entries(TIERS) as [VaultTier, TierInfo][]).map(([key, tier]) => (
            <button
              key={key}
              className={`tier-card ${selectedTier === key ? 'selected' : ''}`}
              onClick={() => {
                setSelectedTier(key);
                hapticFeedback('selection');
              }}
            >
              <span className="tier-name">{tier.name}</span>
              <span className="tier-apy">{tier.targetApy} APY</span>
              <span className="tier-drawdown">Max DD: {tier.maxDrawdown}</span>
              <span className="tier-desc">{tier.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {amount && parseFloat(amount) > 0 && (
        <div className="card summary-card">
          <h3>Deposit Summary</h3>
          <div className="summary-row">
            <span>Amount</span>
            <span>{amount} USDC</span>
          </div>
          <div className="summary-row">
            <span>Tier</span>
            <span>{TIERS[selectedTier].name}</span>
          </div>
          <div className="summary-row">
            <span>Expected APY</span>
            <span>{TIERS[selectedTier].targetApy}</span>
          </div>
          <div className="summary-row">
            <span>Network</span>
            <span>Mantle</span>
          </div>
        </div>
      )}
    </div>
  );
}
