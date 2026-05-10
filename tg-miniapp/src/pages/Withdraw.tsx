import { useState, useCallback } from 'react';
import { showMainButton, hideMainButton, setMainButtonLoading, hapticFeedback } from '../lib/tg';

type VaultTier = 'conservative' | 'balanced' | 'aggressive';

interface TierPosition {
  name: string;
  shares: string;
  currentValue: string;
  sharePrice: string;
}

const POSITIONS: Record<VaultTier, TierPosition> = {
  conservative: {
    name: 'Conservative',
    shares: '5,000.00',
    currentValue: '5,312.50',
    sharePrice: '1.0625',
  },
  balanced: {
    name: 'Balanced',
    shares: '4,000.00',
    currentValue: '4,620.00',
    sharePrice: '1.1550',
  },
  aggressive: {
    name: 'Aggressive',
    shares: '2,000.00',
    currentValue: '2,517.82',
    sharePrice: '1.2589',
  },
};

export default function Withdraw() {
  const [selectedTier, setSelectedTier] = useState<VaultTier>('balanced');
  const [sharesAmount, setSharesAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const position = POSITIONS[selectedTier];
  const maxShares = parseFloat(position.shares.replace(/,/g, ''));
  const sharePrice = parseFloat(position.sharePrice);
  const inputShares = parseFloat(sharesAmount) || 0;
  const estimatedUsdc = (inputShares * sharePrice).toFixed(2);
  const isValid = inputShares > 0 && inputShares <= maxShares;

  const handleWithdraw = useCallback(async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    setMainButtonLoading(true);
    hapticFeedback('impact');

    try {
      // TODO: integrate with vault contract withdraw
      await new Promise((resolve) => setTimeout(resolve, 2000));
      hapticFeedback('notification');
      alert(`Withdrew ${sharesAmount} shares (~$${estimatedUsdc} USDC) from ${position.name} vault`);
      setSharesAmount('');
      hideMainButton();
    } catch (err) {
      console.error('Withdraw failed:', err);
    } finally {
      setIsSubmitting(false);
      setMainButtonLoading(false);
    }
  }, [sharesAmount, isValid, estimatedUsdc, position.name]);

  const handleAmountChange = (value: string) => {
    if (/^\d*\.?\d*$/.test(value)) {
      setSharesAmount(value);
      const parsed = parseFloat(value) || 0;
      if (parsed > 0 && parsed <= maxShares) {
        showMainButton(`Withdraw ~$${(parsed * sharePrice).toFixed(2)} USDC`, handleWithdraw);
      } else {
        hideMainButton();
      }
    }
  };

  return (
    <div className="page">
      <h1>Withdraw</h1>
      <p className="subtitle">Redeem vault shares for USDC.</p>

      {/* Tier Selection */}
      <div className="card">
        <label className="input-label">Select Vault Tier</label>
        <div className="tier-grid">
          {(Object.entries(POSITIONS) as [VaultTier, TierPosition][]).map(([key, tier]) => (
            <button
              key={key}
              className={`tier-card ${selectedTier === key ? 'selected' : ''}`}
              onClick={() => {
                setSelectedTier(key);
                setSharesAmount('');
                hideMainButton();
                hapticFeedback('selection');
              }}
            >
              <span className="tier-name">{tier.name}</span>
              <span className="tier-apy">{tier.shares} shares</span>
              <span className="tier-desc">${tier.currentValue} value</span>
            </button>
          ))}
        </div>
      </div>

      {/* Shares Input */}
      <div className="card">
        <label className="input-label">Shares to Withdraw</label>
        <div className="amount-input-wrapper">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={sharesAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="amount-input"
            disabled={isSubmitting}
          />
          <button
            className="max-btn"
            onClick={() => handleAmountChange(maxShares.toString())}
          >
            MAX
          </button>
        </div>
        <p className="balance-hint">
          Available: {position.shares} shares (${position.currentValue})
        </p>
      </div>

      {/* Estimated Output */}
      {inputShares > 0 && (
        <div className="card summary-card">
          <h3>Withdrawal Summary</h3>
          <div className="summary-row">
            <span>Vault Tier</span>
            <span>{position.name}</span>
          </div>
          <div className="summary-row">
            <span>Shares to Redeem</span>
            <span>{sharesAmount}</span>
          </div>
          <div className="summary-row">
            <span>Share Price</span>
            <span>${position.sharePrice} USDC</span>
          </div>
          <div className="summary-row">
            <span>Estimated USDC Output</span>
            <span>${estimatedUsdc}</span>
          </div>
          <div className="summary-row">
            <span>Network</span>
            <span>Mantle</span>
          </div>
          {inputShares > maxShares && (
            <p className="input-hint" style={{ color: '#f87171' }}>
              Exceeds available shares.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
