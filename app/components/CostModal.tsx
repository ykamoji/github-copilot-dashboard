'use client';

import { PRICING_MAP } from '../utils/pricing';
import { UsageRecord } from './Dashboard';

interface CostModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: UsageRecord[];
}

export default function CostModal({ isOpen, onClose, data }: CostModalProps) {
  if (!isOpen) return null;

  // Group data by Session ID and Model
  const breakdown: Record<string, {
    sessionId: string;
    model: string;
    inputTokens: number;
    cachedTokens: number;
    outputTokens: number;
    thinkingTokens: number;
    inputCost: number;
    cachedCost: number;
    outputCost: number;
    totalCost: number;
  }> = {};

  let grandTotal = 0;

  for (const r of data) {
    const sId = r.session_id || 'N/A';
    const m = r.model || 'Unknown';
    const key = `${sId}_${m}`;
    
    if (!breakdown[key]) {
      breakdown[key] = {
        sessionId: sId,
        model: m,
        inputTokens: 0,
        cachedTokens: 0,
        outputTokens: 0,
        thinkingTokens: 0,
        inputCost: 0,
        cachedCost: 0,
        outputCost: 0,
        totalCost: 0,
      };
    }

    const item = breakdown[key];
    item.inputTokens += (r.input_tokens || 0);
    item.cachedTokens += (r.cached_tokens || 0);
    item.outputTokens += (r.output_tokens || 0);
    item.thinkingTokens += (r.thinking_tokens || 0);

    const pricing = PRICING_MAP[m];
    if (pricing) {
      const iCost = ((r.input_tokens || 0) / 1_000_000) * pricing.input;
      const cCost = ((r.cached_tokens || 0) / 1_000_000) * pricing.cachedInput;
      const oCost = (((r.output_tokens || 0) + (r.thinking_tokens || 0)) / 1_000_000) * pricing.output;
      item.inputCost += iCost;
      item.cachedCost += cCost;
      item.outputCost += oCost;
      item.totalCost += (iCost + cCost + oCost);
      grandTotal += (iCost + cCost + oCost);
    }
  }

  // Sort by highest cost first
  const sortedBreakdown = Object.values(breakdown).sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cost Breakdown</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <table className="cost-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Model</th>
                <th className="money">Input Cost</th>
                <th className="money">Cached Cost</th>
                <th className="money">Output Cost</th>
                <th className="money">Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {sortedBreakdown.map((row) => (
                <tr key={`${row.sessionId}_${row.model}`}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.sessionId.substring(0, 12)}...</td>
                  <td className="strong">{row.model}</td>
                  <td className="money">${row.inputCost.toFixed(4)}</td>
                  <td className="money">${row.cachedCost.toFixed(4)}</td>
                  <td className="money">${row.outputCost.toFixed(4)}</td>
                  <td className="money strong" style={{ color: 'var(--accent-emerald)' }}>${row.totalCost.toFixed(4)}</td>
                </tr>
              ))}
              {sortedBreakdown.length > 0 && (
                <tr className="total-row">
                  <td colSpan={5} style={{ textAlign: 'right', paddingRight: '24px' }}>Grand Total</td>
                  <td className="money" style={{ color: 'var(--accent-emerald)' }}>${grandTotal.toFixed(2)}</td>
                </tr>
              )}
              {sortedBreakdown.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0' }}>No cost data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
