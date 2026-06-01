'use client';

import { useState, useEffect, useCallback } from 'react';
import Controls, { formatMonth } from './Controls';
import CreditsLineChart from './CreditsLineChart';
import TokensBarChart from './TokensBarChart';
import CostModal from './CostModal';
import { calculateCost } from '../utils/pricing';

export interface UsageRecord {
  model: string;
  credit_rate: number | null;
  credits: number | null;
  input_tokens: number | null;
  cached_tokens: number | null;
  output_tokens: number | null;
  thinking_tokens: number | null;
  [key: string]: any;
}

export default function Dashboard() {
  /* ── State ── */
  const [allModels, setAllModels] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const { start: defaultStart, end: defaultEnd } = formatMonth();
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);
  const [groupBySession, setGroupBySession] = useState<boolean>(false);
  const [useRateCredits, setUseRateCredits] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [data, setData] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch model list on mount ── */
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch('/api/models');
        const json = await res.json();
        if (json.status === 'success') {
          setAllModels(json.data);
          setSelectedModels(json.data); // default: all selected
        }
      } catch (err) {
        console.error('Failed to fetch models', err);
      }
    }
    fetchModels();
  }, []);

  /* ── Fetch usage data whenever filters change ── */
  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedModels.length > 0 && selectedModels.length < allModels.length) {
        params.set('models', selectedModels.join(','));
      }
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      if (groupBySession) params.set('group_by_session', 'true');

      const res = await fetch(`/api/usage?${params.toString()}`);
      const json = await res.json();

      if (json.status === 'success') {
        setData(json.data);
      } else {
        setError(json.message || 'Failed to load usage data');
      }
    } catch (err) {
      setError('Failed to connect to the backend API. Is the Flask server running?');
    } finally {
      setLoading(false);
    }
  }, [selectedModels, allModels, startDate, endDate, groupBySession]);

  useEffect(() => {
    if (allModels.length > 0) {
      fetchUsage();
    }
  }, [fetchUsage, allModels]);

  /* ── Derive which models to show in charts ── */
  const activeModels =
    selectedModels.length > 0 ? selectedModels : allModels;

  /* ── Compute Totals ── */
  const totalCredits = data.reduce((acc, curr) => acc + (useRateCredits ? (curr.credit_rate || 0) : (curr.credits || 0)), 0);
  const totalInput = data.reduce((acc, curr) => acc + (curr.input_tokens || 0), 0);
  const totalOutput = data.reduce((acc, curr) => acc + (curr.output_tokens || 0), 0);
  const totalThinking = data.reduce((acc, curr) => acc + (curr.thinking_tokens || 0), 0);
  const totalCost = data.reduce((acc, curr) => acc + calculateCost(curr.model, curr.input_tokens || 0, curr.cached_tokens || 0, curr.output_tokens || 0, curr.thinking_tokens || 0), 0);

  return (
    <div className="dashboard-shell">
      {/* Header */}
      <header className="dashboard-header">
        <h1>Copilot Dashboard</h1>
        <p>AI Credit Usage Analytics</p>
      </header>

      {/* Controls */}
      <Controls
        models={allModels}
        selectedModels={selectedModels}
        onModelsChange={setSelectedModels}
        startDate={startDate}
        endDate={endDate}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
        groupBySession={groupBySession}
        onGroupBySessionChange={setGroupBySession}
        useRateCredits={useRateCredits}
        onCreditTypeChange={setUseRateCredits}
      />

      {/* Content */}
      {loading && (
        <div className="card state-message">
          <span className="loading-text">Loading data…</span>
        </div>
      )}

      {error && (
        <div className="card state-message error">{error}</div>
      )}

      {!loading && !error && (
        <div>
          {/* Summary Box */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <div className="card-title" style={{ marginBottom: '8px' }}>Total {useRateCredits ? 'Rate Credits' : 'Absolute Credits'}</div>
              <div className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: '800' }}>{totalCredits.toFixed(2)}</div>
            </div>
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <div className="card-title" style={{ marginBottom: '8px' }}>Total Input Tokens</div>
              <div style={{ color: '#6366f1', fontSize: '2.5rem', fontWeight: '800' }}>
                {totalInput >= 1000 ? (totalInput / 1000).toFixed(1) + 'k' : totalInput}
              </div>
            </div>
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <div className="card-title" style={{ marginBottom: '8px' }}>Total Output Tokens</div>
              <div style={{ color: '#06b6d4', fontSize: '2.5rem', fontWeight: '800' }}>
                {totalOutput >= 1000 ? (totalOutput / 1000).toFixed(1) + 'k' : totalOutput}
              </div>
            </div>
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <div className="card-title" style={{ marginBottom: '8px' }}>Total Thinking Tokens</div>
              <div style={{ color: '#8b5cf6', fontSize: '2.5rem', fontWeight: '800' }}>
                {totalThinking >= 1000 ? (totalThinking / 1000).toFixed(1) + 'k' : totalThinking}
              </div>
            </div>
            <div
              className="card"
              style={{ padding: '24px', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--accent-emerald)', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onClick={() => setIsModalOpen(true)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="card-title" style={{ marginBottom: '8px' }}>Total Cost (USD) <span style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', opacity: 0.8 }}>(Click for breakdown)</span></div>
              <div style={{ color: 'var(--accent-emerald)', fontSize: '2.5rem', fontWeight: '800' }}>
                ${totalCost.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="charts-grid">
            <CreditsLineChart
              data={data}
              models={activeModels}
              useRateCredits={useRateCredits}
            />
            <TokensBarChart
              data={data}
              models={activeModels}
            />
          </div>
        </div>
      )}

      <CostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={data} />
    </div>
  );
}
