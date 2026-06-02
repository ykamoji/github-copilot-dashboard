'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/AuthContext';
import Controls, { formatMonth } from '../controls/Controls';
import CreditsLineChart from '../charts/CreditsLineChart';
import TokensBarChart from '../charts/TokensBarChart';
import CostModal from '../tables/CostModal';
import PerformanceScatter from '../charts/PerformanceScatter';
import ModelPieChart from '../charts/ModelPieChart';
import UsageHeatmap from '../charts/UsageHeatmap';
import RecordsTable from '../tables/RecordsTable';
import { calculateCost } from '../../utils/pricing';
import { UsageRecord, formatTokens } from '../../types';

export default function Dashboard({ targetUserId }: { targetUserId?: string }) {
  const { user, token, logout } = useAuth();
  const router = useRouter();

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
      if (!token) return;
      try {
        const url = targetUserId ? `/api/models?target_user_id=${targetUserId}` : '/api/models';
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
          logout();
          return;
        }
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
      if (targetUserId) params.set('target_user_id', targetUserId);

      const res = await fetch(`/api/usage?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        logout();
        return;
      }
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

  /* ── Auto-toggle credits vs credit rates based on filtered data ── */
  useEffect(() => {
    if (data.length > 0) {
      const hasCredits = data.some(
        (r) => r.credits !== null && r.credits !== undefined
      );
      const hasCreditRates = data.some(
        (r) => r.credit_rate !== null && r.credit_rate !== undefined
      );
      if (hasCredits && !hasCreditRates) {
        setUseRateCredits(false);
      } else if (hasCreditRates && !hasCredits) {
        setUseRateCredits(true);
      }
    }
  }, [data]);

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
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Copilot Dashboard</h1>
          <p>AI Credit Usage Analytics {targetUserId ? '(Viewing User)' : ''}</p>
        </div>
        
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {user.role === 'viewer' && (
              <button 
                onClick={logout}
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
              >
                ← Back
              </button>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{user.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user.role}</div>
            </div>
            {user.role === 'admin' && !targetUserId && (
              <button 
                onClick={() => router.push('/admin')}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-indigo)', color: 'var(--accent-indigo)', padding: '8px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
              >
                Admin Panel
              </button>
            )}
            <button 
              onClick={logout}
              style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#fda4af', padding: '8px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
            >
              Sign Out
            </button>
          </div>
        )}
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
              <div className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: '800' }}>
                {totalCredits.toFixed(2)}{useRateCredits ? 'x' : ''}
              </div>
            </div>
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <div className="card-title" style={{ marginBottom: '8px' }}>Total Input Tokens</div>
              <div style={{ color: '#6366f1', fontSize: '2.5rem', fontWeight: '800' }}>
                {formatTokens(totalInput)}
              </div>
            </div>
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <div className="card-title" style={{ marginBottom: '8px' }}>Total Output Tokens</div>
              <div style={{ color: '#06b6d4', fontSize: '2.5rem', fontWeight: '800' }}>
                {formatTokens(totalOutput)}
              </div>
            </div>
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <div className="card-title" style={{ marginBottom: '8px' }}>Total Thinking Tokens</div>
              <div style={{ color: '#8b5cf6', fontSize: '2.5rem', fontWeight: '800' }}>
                {formatTokens(totalThinking)}
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

          {/* Individual Records Table */}
          <RecordsTable data={data} useRateCredits={useRateCredits} />

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

          <div className="small-charts-grid">
            <ModelPieChart
              data={data}
              models={activeModels}
              useRateCredits={useRateCredits}
            />
            <UsageHeatmap data={data} />
          </div>

          {/* Performance Scatter – full width */}
          <div style={{ marginTop: '24px' }}>
            <PerformanceScatter
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
