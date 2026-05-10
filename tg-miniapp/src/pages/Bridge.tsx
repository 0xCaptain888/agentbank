import { useState, useCallback } from 'react';
import { showMainButton, hideMainButton, setMainButtonLoading, hapticFeedback } from '../lib/tg';

type SourceChain = 'ethereum' | 'arbitrum' | 'bnb' | 'base';

interface ChainInfo {
  name: string;
  symbol: string;
  estimatedTime: string;
  fee: string;
}

const CHAINS: Record<SourceChain, ChainInfo> = {
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    estimatedTime: '10-15 min',
    fee: '$2.50',
  },
  arbitrum: {
    name: 'Arbitrum',
    symbol: 'ARB',
    estimatedTime: '5-8 min',
    fee: '$0.40',
  },
  bnb: {
    name: 'BNB Chain',
    symbol: 'BNB',
    estimatedTime: '8-12 min',
    fee: '$0.80',
  },
  base: {
    name: 'Base',
    symbol: 'BASE',
    estimatedTime: '5-10 min',
    fee: '$0.35',
  },
};

export default function Bridge() {
  const [sourceChain, setSourceChain] = useState<SourceChain>('ethereum');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const chain = CHAINS[sourceChain];
  const isValid = parseFloat(amount) > 0;

  const handleBridge = useCallback(async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    setMainButtonLoading(true);
    hapticFeedback('impact');

    try {
      // TODO: integrate with M27 bridge contract
      await new Promise((resolve) => setTimeout(resolve, 2500));
      hapticFeedback('notification');
      alert(`Bridging ${amount} USDC from ${chain.name} to Mantle. Estimated arrival: ${chain.estimatedTime}`);
      setAmount('');
      hideMainButton();
    } catch (err) {
      console.error('Bridge failed:', err);
    } finally {
      setIsSubmitting(false);
      setMainButtonLoading(false);
    }
  }, [amount, isValid, chain]);

  const handleAmountChange = (value: string) => {
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      if (parseFloat(value) > 0) {
        showMainButton(`Bridge ${value} USDC to Mantle`, handleBridge);
      } else {
        hideMainButton();
      }
    }
  };

  return (
    <div className="page">
      <h1>Bridge to Mantle</h1>
      <p className="subtitle">Bridge USDC from other chains into Mantle via M27.</p>

      {/* Source Chain Selection */}
      <div className="card">
        <label className="input-label">Source Chain</label>
        <div className="chip-group">
          {(Object.entries(CHAINS) as [SourceChain, ChainInfo][]).map(([key, info]) => (
            <button
              key={key}
              className={`chip ${sourceChain === key ? 'selected' : ''}`}
              onClick={() => {
                setSourceChain(key);
                hapticFeedback('selection');
              }}
            >
              {info.name}
            </button>
          ))}
        </div>
      </div>

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
        <p className="balance-hint">Available: 1,000.00 USDC on {chain.name}</p>
      </div>

      {/* Bridge Details */}
      {isValid && (
        <div className="card summary-card">
          <h3>Bridge Summary</h3>
          <div className="summary-row">
            <span>From</span>
            <span>{chain.name}</span>
          </div>
          <div className="summary-row">
            <span>To</span>
            <span>Mantle</span>
          </div>
          <div className="summary-row">
            <span>Amount</span>
            <span>{amount} USDC</span>
          </div>
          <div className="summary-row">
            <span>Estimated Arrival</span>
            <span>{chain.estimatedTime}</span>
          </div>
          <div className="summary-row">
            <span>Bridge Fee</span>
            <span>{chain.fee}</span>
          </div>
        </div>
      )}

      {/* Bridge Button */}
      <button
        className="btn-primary full-width"
        disabled={!isValid || isSubmitting}
        onClick={handleBridge}
      >
        {isSubmitting ? 'Bridging...' : `Bridge to Mantle`}
      </button>
    </div>
  );
}
