'use client';

import { useState, Fragment, useEffect } from 'react';
import { PRICING_MAP, calculateDetailedCosts } from '@/utils/pricing';
import { UsageRecord } from '@/types';
import './CostModal.css';

interface CostModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: UsageRecord[];
  useRateCredits?: boolean;
}

export default function CostModal({ isOpen, onClose, data, useRateCredits = false }: CostModalProps) {
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedModels({});
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleModel = (model: string) => {
    setExpandedModels((prev) => ({
      ...prev,
      [model]: !prev[model],
    }));
  };

  // Group data by Model, and inside it, by Session ID
  interface SessionBreakdown {
    sessionId: string;
    inputCost: number;
    cachedCost: number;
    outputCost: number;
    totalCost: number;
    aiCredits: number;
  }

  interface ModelGroup {
    model: string;
    inputCost: number;
    cachedCost: number;
    outputCost: number;
    totalCost: number;
    aiCredits: number;
    sessions: Record<string, SessionBreakdown>;
  }

  const modelGroups: Record<string, ModelGroup> = {};
  let grandTotal = 0;
  let grandTotalCredits = 0;
  let grandTotalInput = 0;
  let grandTotalOutput = 0;
  let grandTotalCache = 0;

  for (const r of data) {
    const sId = r.session_id || 'N/A';
    const m = r.model || 'Unknown';

    if (!modelGroups[m]) {
      modelGroups[m] = {
        model: m,
        inputCost: 0,
        cachedCost: 0,
        outputCost: 0,
        totalCost: 0,
        aiCredits: 0,
        sessions: {},
      };
    }

    const group = modelGroups[m];

    if (!group.sessions[sId]) {
      group.sessions[sId] = {
        sessionId: sId,
        inputCost: 0,
        cachedCost: 0,
        outputCost: 0,
        totalCost: 0,
        aiCredits: 0,
      };
    }

    const session = group.sessions[sId];

    const creditsToAdd = useRateCredits ? (r.credit_rate || 0) : (r.credits || 0);
    session.aiCredits += creditsToAdd;
    group.aiCredits += creditsToAdd;
    grandTotalCredits += creditsToAdd;

    const pricing = PRICING_MAP[m];
    if (pricing) {
      const { inputCost: iCost, outputCost: oCost, cachedCost: cCost, totalCost: total } = calculateDetailedCosts(
        m,
        r.input_tokens || 0,
        r.output_tokens || 0,
        r.thinking_tokens || 0,
        r.credits || 0,
        useRateCredits
      );

      // Update session cost
      session.inputCost += iCost;
      session.cachedCost += cCost;
      session.outputCost += oCost;
      session.totalCost += total;

      // Update model cost
      group.inputCost += iCost;
      group.cachedCost += cCost;
      group.outputCost += oCost;
      group.totalCost += total;

      // Update grand totals
      grandTotal += total;
      grandTotalInput += iCost;
      grandTotalOutput += oCost;
      grandTotalCache += cCost;
    }
  }
  // Sort models by total cost descending
  const sortedModels = Object.values(modelGroups).sort((a, b) => b.totalCost - a.totalCost);

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
                <th>Model / Session ID</th>
                <th className="money">{useRateCredits ? 'Rate Credits' : 'AI Credits'}</th>
                <th className="money">Input Cost</th>
                <th className="money">Output Cost</th>
                {!useRateCredits && <th className="money">Cached Cost</th>}
                <th className="money">Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {sortedModels.map((group) => {
                const isExpanded = !!expandedModels[group.model];
                const sortedSessions = Object.values(group.sessions).sort(
                  (a, b) => b.totalCost - a.totalCost
                );

                return (
                  <Fragment key={group.model}>
                    {/* Model Parent Row */}
                    <tr
                      onClick={() => toggleModel(group.model)}
                      style={{ cursor: 'pointer', background: 'rgba(255, 255, 255, 0.01)' }}
                      className="model-parent-row"
                    >
                      <td className="strong" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', width: '12px', display: 'inline-block' }}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        {group.model}
                      </td>
                      <td className="money">{group.aiCredits.toFixed(2)}{useRateCredits ? 'x' : ''}</td>
                      <td className="money">${group.inputCost.toFixed(4)}</td>
                      <td className="money">${group.outputCost.toFixed(4)}</td>
                      {!useRateCredits && <td className="money">${group.cachedCost.toFixed(4)}</td>}
                      <td className="money strong" style={{ color: 'var(--accent-emerald)' }}>
                        ${group.totalCost.toFixed(4)}
                      </td>
                    </tr>

                    {/* Collapsible Session Child Rows */}
                    {isExpanded &&
                      sortedSessions.map((session) => (
                        <tr
                          key={session.sessionId}
                          className="session-child-row"
                        >
                          <td style={{ paddingLeft: '32px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            ↳ {session.sessionId.substring(0, 16)}...
                          </td>
                          <td className="money" style={{ opacity: 0.75 }}>{session.aiCredits.toFixed(2)}{useRateCredits ? 'x' : ''}</td>
                          <td className="money" style={{ opacity: 0.75 }}>${session.inputCost.toFixed(4)}</td>
                          <td className="money" style={{ opacity: 0.75 }}>${session.outputCost.toFixed(4)}</td>
                          {!useRateCredits && <td className="money" style={{ opacity: 0.75 }}>${session.cachedCost.toFixed(4)}</td>}
                          <td className="money" style={{ color: 'var(--accent-emerald)', opacity: 0.85 }}>
                            ${session.totalCost.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
              {sortedModels.length > 0 && (
                <tr className="total-row">
                  <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Grand Total</td>
                  <td className="money">{grandTotalCredits.toFixed(2)}{useRateCredits ? 'x' : ''}</td>
                  <td className="money">${grandTotalInput.toFixed(4)}</td>
                  <td className="money">${grandTotalOutput.toFixed(4)}</td>
                  {!useRateCredits && <td className="money">${grandTotalCache.toFixed(4)}</td>}
                  <td className="money" style={{ color: 'var(--accent-emerald)' }}>${grandTotal.toFixed(4)}</td>
                </tr>
              )}
              {sortedModels.length === 0 && (
                <tr>
                  <td colSpan={useRateCredits ? 5 : 6} style={{ textAlign: 'center', padding: '48px 0' }}>No cost data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
