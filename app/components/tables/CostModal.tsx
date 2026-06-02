'use client';

import { useState, Fragment, useEffect } from 'react';
import { PRICING_MAP } from '../../utils/pricing';
import { UsageRecord } from '../../types';
import './CostModal.css';

interface CostModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: UsageRecord[];
}

export default function CostModal({ isOpen, onClose, data }: CostModalProps) {
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
  }

  interface ModelGroup {
    model: string;
    inputCost: number;
    cachedCost: number;
    outputCost: number;
    totalCost: number;
    sessions: Record<string, SessionBreakdown>;
  }

  const modelGroups: Record<string, ModelGroup> = {};
  let grandTotal = 0;

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
      };
    }

    const session = group.sessions[sId];

    const pricing = PRICING_MAP[m];
    if (pricing) {
      const iCost = ((r.input_tokens || 0) / 1_000_000) * pricing.input;
      const cCost = ((r.cached_tokens || 0) / 1_000_000) * pricing.cachedInput;
      const oCost = (((r.output_tokens || 0) + (r.thinking_tokens || 0)) / 1_000_000) * pricing.output;
      const total = iCost + cCost + oCost;

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

      grandTotal += total;
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
                <th className="money">Input Cost</th>
                <th className="money">Cached Cost</th>
                <th className="money">Output Cost</th>
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
                      <td className="money">${group.inputCost.toFixed(4)}</td>
                      <td className="money">${group.cachedCost.toFixed(4)}</td>
                      <td className="money">${group.outputCost.toFixed(4)}</td>
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
                          <td className="money" style={{ opacity: 0.75 }}>${session.inputCost.toFixed(4)}</td>
                          <td className="money" style={{ opacity: 0.75 }}>${session.cachedCost.toFixed(4)}</td>
                          <td className="money" style={{ opacity: 0.75 }}>${session.outputCost.toFixed(4)}</td>
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
                  <td colSpan={4} style={{ textAlign: 'right', paddingRight: '24px' }}>Grand Total</td>
                  <td className="money" style={{ color: 'var(--accent-emerald)' }}>${grandTotal.toFixed(2)}</td>
                </tr>
              )}
              {sortedModels.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '48px 0' }}>No cost data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
