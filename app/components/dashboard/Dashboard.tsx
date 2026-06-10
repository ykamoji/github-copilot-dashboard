'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useFetchWithCache } from '@/hooks/useFetchWithCache';
import { API_BASE } from '@/api';
import Controls, { DashboardFilters } from '@/components/controls/Controls';
import CostModal from '@/components/tables/costModal/CostModal';
import RecordsTable from '@/components/tables/recordsTable/RecordsTable';
import { UsageRecord } from '@/types';
import { calculateDetailedCosts } from '@/utils/pricing';
import { formatMonth } from '@/utils/controlHelpers';

import DashboardHeader from './DashboardHeader';
import SummaryBox from './SummaryBox';
import InsightsRow from './InsightsRow';
import ChartsPanel from './ChartsPanel';

export default function Dashboard({ targetUserId }: { targetUserId?: string }) {
  const { user, token, logout } = useAuth();

  /* ── Filter state ── */
  const { start: defaultStart, end: defaultEnd } = formatMonth();
  const [allModels, setAllModels] = useState<string[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>({
    selectedModels: [],
    startDate: defaultStart,
    endDate: defaultEnd,
    groupBySession: false,
    useRateCredits: false,
  });
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  /* ── Data state ── */
  const [data, setData] = useState<UsageRecord[]>([]);
  const [cumulativeData, setCumulativeData] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [allTimeCost, setAllTimeCost] = useState<number | null>(null);
  const [allTimeAvgDailyCredits, setAllTimeAvgDailyCredits] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const fetchWithCache = useFetchWithCache();

  /* ── Fetch available models ── */
  useEffect(() => {
    async function fetchModels() {
      try {
        const url = targetUserId ? `${API_BASE}/api/models?target_user_id=${targetUserId}` : `${API_BASE}/api/models`;
        const json = await fetchWithCache(url);
        if (json?.status === 'success') {
          setAllModels(json.data);
          setFilters(prev => ({ ...prev, selectedModels: json.data }));
        }
      } catch (err) {
        console.error('Failed to fetch models', err);
      }
    }
    fetchModels();
  }, [token, targetUserId, logout, fetchWithCache, refreshKey]);

  /* ── Fetch all-time cost + avg daily credits ── */
  useEffect(() => {
    async function fetchAllTimeCost() {
      try {
        const params = new URLSearchParams();
        if (targetUserId) params.set('target_user_id', targetUserId);
        const json = await fetchWithCache(`${API_BASE}/api/usage?${params.toString()}`);
        if (json?.status === 'success') {
          const records = json.data as UsageRecord[];

          const cost = records.reduce((acc: number, curr: UsageRecord) => {
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

          const absRecords = records.filter(r => r.credits !== null && r.credits !== undefined);
          if (absRecords.length > 0) {
            const distinctDays = new Set(absRecords.map(r => r.date as string).filter(Boolean));
            const total = absRecords.reduce((s, r) => s + (r.credits || 0), 0);
            setAllTimeAvgDailyCredits(+(total / Math.max(distinctDays.size, 1)).toFixed(3));
          }
        }
      } catch (err) {
        console.error('Failed to fetch all-time cost', err);
      }
    }
    fetchAllTimeCost();
  }, [token, targetUserId, fetchWithCache, refreshKey]);

  /* ── Fetch filtered usage data ── */
  const fetchUsage = useCallback(async () => {
    if (!loading) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.selectedModels.length > 0 && filters.selectedModels.length < allModels.length)
        params.set('models', filters.selectedModels.join(','));
      if (filters.startDate) params.set('start', filters.startDate);
      if (filters.endDate) params.set('end', filters.endDate);
      if (filters.groupBySession) params.set('group_by_session', 'true');
      if (targetUserId) params.set('target_user_id', targetUserId);

      const json = await fetchWithCache(`${API_BASE}/api/usage?${params.toString()}`);
      if (!json) return;
      if (json.status === 'success') {
        setData(json.data);

        // Fetch cumulative monthly data if start is not monthStart
        const startOfMonth = filters.startDate ? filters.startDate.slice(0, 7) + '-01' : '';
        if (!startOfMonth || startOfMonth === filters.startDate) {
          setCumulativeData(json.data);
        } else {
          const cumulativeParams = new URLSearchParams(params);
          cumulativeParams.set('start', startOfMonth);
          const cumJson = await fetchWithCache(`${API_BASE}/api/usage?${cumulativeParams.toString()}`);
          if (cumJson?.status === 'success') {
            setCumulativeData(cumJson.data);
          } else {
            setCumulativeData([]);
          }
        }
      } else {
        setError(json.message || 'Failed to load usage data');
      }
    } catch {
      setError('Failed to connect to the backend API. Is the Flask server running?');
    } finally {
      setLoading(false);
    }
  }, [
    filters.selectedModels,
    filters.startDate,
    filters.endDate,
    filters.groupBySession,
    allModels,
    fetchWithCache,
    targetUserId,
    refreshKey
  ]);

  useEffect(() => {
    console.log('fetchUsage')
    if (allModels.length > 0) fetchUsage();
  }, [fetchUsage, allModels]);

  /* ── Auto-toggle credit type ── */
  useEffect(() => {
    if (data.length > 0) {
      const hasCredits = data.some(r => r.credits !== null && r.credits !== undefined);
      const hasCreditRates = data.some(r => r.credit_rate !== null && r.credit_rate !== undefined);
      setFilters(prev => {
        let newUseRateCredits = prev.useRateCredits;
        if (hasCredits && !hasCreditRates) newUseRateCredits = false;
        else if (hasCreditRates && !hasCredits) newUseRateCredits = true;

        if (newUseRateCredits !== prev.useRateCredits) {
          return { ...prev, useRateCredits: newUseRateCredits };
        }
        return prev; // Return original object if no change, breaking any render cycles
      });
    }
  }, [data]);

  /* ── Derived values ── */
  const activeModels = filters.selectedModels.length > 0 ? filters.selectedModels : allModels;

  /* ── Budget ── */
  const monthlyBudget = user?.ai_token_budget ?? null;

  /* ── Actions ── */
  const handleGoLive = async () => {
    if (!loading) setLoading(true);
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('dashboard_cache_')) { sessionStorage.removeItem(key); i--; }
    }
    try {
      await fetch(`${API_BASE}/api/cache/clear`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    } catch (e) {
      console.error('Failed to clear backend cache', e);
    }
    setRefreshKey(prev => prev + 1);
  };

  /* ── Render ── */
  return (
    <div className="dashboard-shell">
      {user && (
        <DashboardHeader
          user={user}
          loading={loading}
          targetUserId={targetUserId}
          onSync={handleGoLive}
          onLogout={logout}
        />
      )}

      <Controls
        models={allModels}
        filters={filters}
        onFilterChange={(updates) => setFilters(prev => ({ ...prev, ...updates }))}
        targetUserId={targetUserId}
        refreshKey={refreshKey}
      />

      {loading && (
        <div className="card state-message">
          <span className="loading-text">Loading data…</span>
        </div>
      )}

      {error && <div className="card state-message error">{error}</div>}

      {!loading && !error && (
        <div>
          <SummaryBox
            data={data}
            allTimeCost={allTimeCost}
            useRateCredits={filters.useRateCredits}
            onCostClick={() => setIsModalOpen(true)}
          />

           <InsightsRow
            data={data}
            cumulativeData={cumulativeData}
            useRateCredits={filters.useRateCredits}
            monthlyBudget={monthlyBudget}
            allTimeAvgDailyCredits={allTimeAvgDailyCredits}
            startDate={filters.startDate}
            endDate={filters.endDate}
          />

          <RecordsTable data={data} useRateCredits={filters.useRateCredits} />

          <ChartsPanel
            data={data}
            activeModels={activeModels}
            useRateCredits={filters.useRateCredits}
          />
        </div>
      )}

      <CostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={data}
        useRateCredits={filters.useRateCredits}
      />
    </div>
  );
}
