import { useState, useCallback } from 'react';
import { showMainButton, setMainButtonLoading, hapticFeedback } from '../lib/tg';

interface IntentFormData {
  amount: string;
  minApy: string;
  maxDrawdown: string;
  duration: string;
  strategy: string;
}

const STRATEGY_OPTIONS = [
  { value: 'any', label: 'Any Strategy' },
  { value: 'lending', label: 'Lending Only' },
  { value: 'lp', label: 'Liquidity Providing' },
  { value: 'delta-neutral', label: 'Delta Neutral' },
  { value: 'directional', label: 'Directional' },
];

const DURATION_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
];

export default function IntentPost() {
  const [form, setForm] = useState<IntentFormData>({
    amount: '',
    minApy: '',
    maxDrawdown: '',
    duration: '30',
    strategy: 'any',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateField = (field: keyof IntentFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isValid =
    parseFloat(form.amount) > 0 &&
    parseFloat(form.minApy) > 0 &&
    parseFloat(form.maxDrawdown) > 0;

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    setMainButtonLoading(true);
    hapticFeedback('impact');

    try {
      // TODO: submit intent to IntentEngine contract
      await new Promise((r) => setTimeout(r, 1500));
      hapticFeedback('notification');
      setSubmitted(true);
    } catch (err) {
      console.error('Intent submission failed:', err);
    } finally {
      setIsSubmitting(false);
      setMainButtonLoading(false);
    }
  }, [form, isValid]);

  if (submitted) {
    return (
      <div className="page">
        <h1>Intent Posted</h1>
        <div className="card success-card">
          <span className="success-icon">&#10003;</span>
          <h3>Your intent has been broadcast!</h3>
          <p>Agents will compete to fulfill your allocation request.</p>
          <div className="intent-summary">
            <div className="summary-row">
              <span>Amount</span><span>{form.amount} USDC</span>
            </div>
            <div className="summary-row">
              <span>Min APY</span><span>{form.minApy}%</span>
            </div>
            <div className="summary-row">
              <span>Max Drawdown</span><span>{form.maxDrawdown}%</span>
            </div>
            <div className="summary-row">
              <span>Duration</span><span>{form.duration} days</span>
            </div>
            <div className="summary-row">
              <span>Strategy</span>
              <span>{STRATEGY_OPTIONS.find((s) => s.value === form.strategy)?.label}</span>
            </div>
          </div>
          <button className="btn-primary" onClick={() => setSubmitted(false)}>
            Post Another Intent
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Post Intent</h1>
      <p className="subtitle">
        Specify your allocation preferences. AI agents will bid to fulfill your intent.
      </p>

      {/* Amount */}
      <div className="card">
        <label className="input-label">Allocation Amount (USDC)</label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="1000"
          value={form.amount}
          onChange={(e) => updateField('amount', e.target.value.replace(/[^0-9.]/g, ''))}
          className="amount-input"
          disabled={isSubmitting}
        />
      </div>

      {/* Min APY */}
      <div className="card">
        <label className="input-label">Minimum APY (%)</label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="10"
          value={form.minApy}
          onChange={(e) => updateField('minApy', e.target.value.replace(/[^0-9.]/g, ''))}
          className="amount-input"
          disabled={isSubmitting}
        />
        <p className="input-hint">Agents must deliver at least this yield to earn fees.</p>
      </div>

      {/* Max Drawdown */}
      <div className="card">
        <label className="input-label">Maximum Drawdown (%)</label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="5"
          value={form.maxDrawdown}
          onChange={(e) => updateField('maxDrawdown', e.target.value.replace(/[^0-9.]/g, ''))}
          className="amount-input"
          disabled={isSubmitting}
        />
        <p className="input-hint">Position will be unwound if drawdown exceeds this.</p>
      </div>

      {/* Duration */}
      <div className="card">
        <label className="input-label">Duration</label>
        <div className="chip-group">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`chip ${form.duration === opt.value ? 'selected' : ''}`}
              onClick={() => updateField('duration', opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Strategy Preference */}
      <div className="card">
        <label className="input-label">Strategy Preference</label>
        <div className="chip-group">
          {STRATEGY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`chip ${form.strategy === opt.value ? 'selected' : ''}`}
              onClick={() => updateField('strategy', opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        className="btn-primary full-width"
        disabled={!isValid || isSubmitting}
        onClick={handleSubmit}
      >
        {isSubmitting ? 'Broadcasting...' : 'Post Intent'}
      </button>
    </div>
  );
}
