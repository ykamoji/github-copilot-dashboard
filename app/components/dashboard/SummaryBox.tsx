'use client';

import { UsageRecord, formatTokens } from '@/types';
import './SummaryBox.css';
import { calculateDetailedCosts } from '@/utils/pricing';

interface SummaryBoxProps {
  data: UsageRecord[];
  allTimeCost: number | null;
  useRateCredits: boolean;
  onCostClick: () => void;
}

export default function SummaryBox({
  data,
  allTimeCost,
  useRateCredits,
  onCostClick,
}: SummaryBoxProps) {
  const totalCredits = data.reduce(
    (acc, curr) => acc + (useRateCredits ? (curr.credit_rate || 0) : (curr.credits || 0)),
    0
  );
  const totalInput = data.reduce((acc, curr) => acc + (curr.input_tokens || 0), 0);
  const totalOutput = data.reduce((acc, curr) => acc + (curr.output_tokens || 0), 0);
  const totalThinking = data.reduce((acc, curr) => acc + (curr.thinking_tokens || 0), 0);
  
  const totalCost = data.reduce((acc, curr) => {
    const { totalCost: tCost } = calculateDetailedCosts(
      curr.model || 'Unknown',
      curr.input_tokens || 0,
      curr.output_tokens || 0,
      curr.thinking_tokens || 0,
      curr.credits || 0,
      useRateCredits
    );
    return acc + tCost;
  }, 0);
  
  const recordCount = data.length;
  return (
    <div className="summary-grid">
      {/* Credits – Hero tile */}
      <div className="summary-hero summary-credits">
        <div className="summary-hero-label">
          {useRateCredits ? 'AI Rate Credits' : 'AI Credits'}
        </div>
        <div
          className="summary-hero-value"
          style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {totalCredits.toFixed(2)}{useRateCredits ? '×' : ''}
        </div>
        <div className="summary-hero-sub">
          {recordCount} record{recordCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Cost – Hero tile */}
      <div
        className="summary-hero summary-cost"
        onClick={onCostClick}
        style={{ cursor: 'pointer' }}
      >
        <div className="summary-hero-label">
          Estimated Cost (USD)
          <span style={{ fontSize: '0.65rem', color: 'var(--accent-emerald)', marginLeft: '6px', opacity: 0.8 }}>
            Click for breakdown
          </span>
        </div>
        <div className="summary-hero-value" style={{ color: 'var(--accent-emerald)' }}>
          ${totalCost.toFixed(2)}
        </div>
        {allTimeCost !== null && (
          <div className="summary-hero-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Grand Total:</span>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: '700', fontSize: '0.9rem' }}>
              ${allTimeCost.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Tokens – Grouped compact tile */}
      <div className="summary-tokens-group">
        {[
          { label: 'Input Tokens',    value: totalInput,    color: '#6366f1' },
          { label: 'Output Tokens',   value: totalOutput,   color: '#06b6d4' },
          { label: 'Thinking Tokens', value: totalThinking, color: '#8b5cf6' },
        ].map(({ label, value, color }, i, arr) => (
          <div key={label}>
            <div className="summary-token-row">
              <div className="summary-token-dot" style={{ background: color }} />
              <div className="summary-token-info">
                <span className="summary-token-label">{label}</span>
                <span className="summary-token-value" style={{ color }}>{formatTokens(value)}</span>
              </div>
            </div>
            {i < arr.length - 1 && <div className="summary-token-divider" />}
          </div>
        ))}
      </div>
    </div>
  );
}
