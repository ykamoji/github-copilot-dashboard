'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { useFetchWithCache } from '@/hooks/useFetchWithCache';
import Controls from '@/components/controls/Controls';
import { formatMonth } from '@/utils/controlHelpers';
import CreditsLineChart from '@/components/charts/CreditsLineChart';
import TokensBarChart from '@/components/charts/TokensBarChart';
import CostModal from '@/components/tables/costModal/CostModal';
import PerformanceScatter from '@/components/charts/PerformanceScatter';
import ModelPieChart from '@/components/charts/ModelPieChart';
import UsageHeatmap from '@/components/charts/UsageHeatmap';
import RecordsTable from '@/components/tables/recordsTable/RecordsTable';
import { UsageRecord, formatTokens } from '@/types';
import { calculateDetailedCosts } from '@/utils/pricing';

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
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const [data, setData] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [allTimeCost, setAllTimeCost] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const fetchWithCache = useFetchWithCache();

  useEffect(() => {
    async function fetchModels() {
      try {
        const url = targetUserId ? `/api/models?target_user_id=${targetUserId}` : '/api/models';
        const json = await fetchWithCache(url);

        if (json && json.status === 'success') {
          setAllModels(json.data);
          setSelectedModels(json.data); // default: all selected
        }
      } catch (err) {
        console.error('Failed to fetch models', err);
      }
    }
    fetchModels();
  }, [token, targetUserId, logout, fetchWithCache, refreshKey]);

  /* ── Fetch all-time cost once ── */
  useEffect(() => {
    async function fetchAllTimeCost() {
      try {
        const params = new URLSearchParams();
        if (targetUserId) params.set('target_user_id', targetUserId);
        const url = `/api/usage?${params.toString()}`;
        const json = await fetchWithCache(url);
        if (json && json.status === 'success') {
          const cost = (json.data as UsageRecord[]).reduce((acc: number, curr: UsageRecord) => {
            const { totalCost: tCost } = calculateDetailedCosts(
              curr.model || 'Unknown',
              curr.input_tokens || 0,
              curr.output_tokens || 0,
              curr.thinking_tokens || 0,
              curr.credits || 0,
              !!curr.credit_rate,
            );
            return acc + tCost;
          }, 0);
          setAllTimeCost(cost);
        }
      } catch (err) {
        console.error('Failed to fetch all-time cost', err);
      }
    }
    fetchAllTimeCost();
  }, [token, targetUserId, fetchWithCache, refreshKey]);

  /* ── Fetch usage data whenever filters change ── */
  const fetchUsage = useCallback(async () => {
    if (!loading) setLoading(true);
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

      const url = `/api/usage?${params.toString()}`;
      const json = await fetchWithCache(url);

      if (!json) return; // logged out or failed

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
  }, [selectedModels, allModels, startDate, endDate, groupBySession, fetchWithCache, targetUserId, refreshKey]);

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

  const handleGoLive = async () => {
    if (!loading) setLoading(true);
    // Clear frontend cache
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('dashboard_cache_')) {
        sessionStorage.removeItem(key);
        i--; // Adjust index because we removed an item
      }
    }

    // Clear backend cache
    try {
      await fetch('/api/cache/clear', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (e) {
      console.error('Failed to clear backend cache', e);
    }

    setRefreshKey(prev => prev + 1);
  };

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
            <button
              onClick={handleGoLive}
              disabled={loading}
              className="header-action-btn"
              style={{
                color: loading ? 'var(--accent-fuchsia)' : 'var(--accent-emerald)',
                borderColor: loading ? 'var(--accent-fuchsia)' : 'var(--accent-emerald)'
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="16" height="16"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginRight: '6px' }}
                className={loading ? 'spin' : ''}
              >
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              {loading ? 'Updating...' : 'Go Live'}
            </button>
            {user.role === 'viewer' && (
              <button
                onClick={logout}
                className="header-action-btn"
              >
                ← Back
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{ textAlign: 'right', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{user.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user.role}</div>
                </div>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>▼</span>
              </div>

              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  minWidth: '150px',
                  zIndex: 100,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                }}>
                  <button
                    onClick={() => router.push('/profile')}
                    className="header-action-btn"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    Profile
                  </button>

                  {user.role === 'admin' && !targetUserId && (
                    <button
                      onClick={() => router.push('/admin')}
                      className="header-action-btn"
                      style={{ width: '100%', justifyContent: 'flex-start' }}
                    >
                      Admin Panel
                    </button>
                  )}

                  <button
                    onClick={logout}
                    className="signout-btn"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
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
        targetUserId={targetUserId}
        refreshKey={refreshKey}
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
          {/* ── Summary Box ── */}
          <div className="summary-grid">
            {/* Credits – Hero tile */}
            <div className="summary-hero summary-credits">
              <div className="summary-hero-label">
                {useRateCredits ? 'AI Rate Credits' : 'AI Credits'}
              </div>
              <div className="summary-hero-value" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {totalCredits.toFixed(2)}{useRateCredits ? '×' : ''}
              </div>
              <div className="summary-hero-sub">
                {data.length} record{data.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Cost – Hero tile */}
            <div
              className="summary-hero summary-cost"
              onClick={() => setIsModalOpen(true)}
              style={{ cursor: 'pointer' }}
            >
              <div className="summary-hero-label">
                Estimated Cost (USD)
                <span style={{ fontSize: '0.65rem', color: 'var(--accent-emerald)', marginLeft: '6px', opacity: 0.8 }}>Click for breakdown</span>
              </div>
              <div className="summary-hero-value" style={{ color: 'var(--accent-emerald)' }}>
                ${totalCost.toFixed(2)}
              </div>
              {allTimeCost !== null && (
                <div className="summary-hero-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Grand Total:</span>
                  <span style={{ color: 'var(--accent-emerald)', fontWeight: '700', fontSize: '0.9rem' }}>${allTimeCost.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Tokens – Grouped compact tile */}
            <div className="summary-tokens-group">
              <div className="summary-token-row">
                <div className="summary-token-dot" style={{ background: '#6366f1' }} />
                <div className="summary-token-info">
                  <span className="summary-token-label">Input Tokens</span>
                  <span className="summary-token-value" style={{ color: '#6366f1' }}>{formatTokens(totalInput)}</span>
                </div>
              </div>
              <div className="summary-token-divider" />
              <div className="summary-token-row">
                <div className="summary-token-dot" style={{ background: '#06b6d4' }} />
                <div className="summary-token-info">
                  <span className="summary-token-label">Output Tokens</span>
                  <span className="summary-token-value" style={{ color: '#06b6d4' }}>{formatTokens(totalOutput)}</span>
                </div>
              </div>
              <div className="summary-token-divider" />
              <div className="summary-token-row">
                <div className="summary-token-dot" style={{ background: '#8b5cf6' }} />
                <div className="summary-token-info">
                  <span className="summary-token-label">Thinking Tokens</span>
                  <span className="summary-token-value" style={{ color: '#8b5cf6' }}>{formatTokens(totalThinking)}</span>
                </div>
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

      <CostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={data} useRateCredits={useRateCredits} />
    </div>
  );
}
