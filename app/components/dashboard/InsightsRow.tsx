'use client';

import { UsageRecord } from '@/types';
import './InsightsRow.css';

/* ── Shared pure helpers ── */
function budgetPct(used: number, budget: number) {
  return Math.min((used / budget) * 100, 100);
}

function budgetColor(pct: number): string {
  if (pct >= 100) return '#ef4444';
  if (pct >= 90) return '#f97316';
  if (pct >= 80) return '#eab308';
  return '#059669';
}

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

/* ── BudgetBar ── */
interface BudgetBarProps {
  label: string;
  used: number;
  cap: number;
}

function BudgetBar({ label, used, cap }: BudgetBarProps) {
  const pct = budgetPct(used, cap);
  const col = budgetColor(pct);
  return (
    <div className="budget-bar-row">
      <div className="budget-bar-meta">
        <span className="budget-bar-period">{label}</span>
        <span className="budget-bar-numbers" style={{ color: col }}>
          {used.toFixed(1)}/ {cap}
          <span className="budget-bar-pct">{pct.toFixed(0)}%</span>
        </span>
      </div>
      <div className="budget-track">
        <div className="budget-fill" style={{ width: `${pct}%`, background: col }} />
      </div>
    </div>
  );
}

/* ── InsightsRow ── */
export interface InsightsRowProps {
  data: UsageRecord[];
  useRateCredits: boolean;
  monthlyBudget: number | null;          // from user.ai_token_budget
  allTimeAvgDailyCredits: number | null; // from all-time fetch in Dashboard
}

export default function InsightsRow({
  data,
  useRateCredits,
  monthlyBudget,
  allTimeAvgDailyCredits,
}: InsightsRowProps) {
  const showRow = !useRateCredits || monthlyBudget !== null;
  if (!showRow) return null;

  /* ── Derived budget buckets ── */
  const weeklyBudget = monthlyBudget !== null ? +(monthlyBudget / 4).toFixed(2) : null;
  const dailyBudget = monthlyBudget !== null ? +(monthlyBudget / 30).toFixed(2) : null;

  /* ── Date anchors ── */
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekStart = getWeekStart();
  const monthPrefix = todayStr.slice(0, 7);      // "YYYY-MM"
  const monthStart = monthPrefix + '-01';
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  /* ── Credit aggregations ── */
  const creditField = (r: UsageRecord) =>
    useRateCredits ? (r.credit_rate || 0) : (r.credits || 0);

  const dailyCredits = data.filter(r => r.date >= todayStr).reduce((s, r) => s + creditField(r), 0);
  const weeklyCredits = data.filter(r => r.date >= weekStart).reduce((s, r) => s + creditField(r), 0);
  const monthlyCredits = data.filter(r => r.date >= monthStart).reduce((s, r) => s + creditField(r), 0);

  /* ── Forecast ── */
  const forecastMonthlyCredits = allTimeAvgDailyCredits !== null
    ? +(allTimeAvgDailyCredits * daysInMonth).toFixed(2)
    : null;

  const currentMonthAbsCredits = data
    .filter(r => (r.date as string)?.startsWith(monthPrefix))
    .reduce((s, r) => s + (r.credits || 0), 0);

  /* ── Render ── */
  return (
    <div className="insights-row">
      {/* Budget Progress Card — rightmost via CSS order:3 */}
      {monthlyBudget !== null && !useRateCredits && (
        <div className="budget-card insights-card">
          <div className="budget-card-header">
            <span className="budget-card-title">AI Credit Budget</span>
            <span className="budget-card-subtitle">
              Credits · Monthly cap:{' '}
              <strong>{monthlyBudget}</strong>
            </span>
          </div>
          <div className="budget-bars">
            <BudgetBar label="Today" used={dailyCredits} cap={dailyBudget!} />
            <BudgetBar label="This Week" used={weeklyCredits} cap={weeklyBudget!} />
            <BudgetBar label="This Month" used={monthlyCredits} cap={monthlyBudget} />
          </div>
        </div>
      )}

      {/* Forecast Card — credits only */}
      {!useRateCredits && forecastMonthlyCredits !== null && (
        <div className="insight-stat-card insights-card">
          <div className="insight-stat-label">
            Forecast — {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <div className="insight-stat-value" style={{ color: '#c026d3' }}>
            {forecastMonthlyCredits.toFixed(1)}
            <span className="insight-stat-unit">credits</span>
          </div>
          <div className="insight-stat-sub">
            <div className="insight-stat-row">
              <span>Spent so far</span>
              <span style={{ color: '#c026d3', fontWeight: 700 }}>{currentMonthAbsCredits.toFixed(1)}</span>
            </div>
            <div className="insight-stat-row">
              <span>Day {dayOfMonth} of {daysInMonth}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                {((dayOfMonth / daysInMonth) * 100).toFixed(0)}%
              </span>
            </div>
            {monthlyBudget !== null && (
              <div
                className="insight-stat-row"
                style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}
              >
                <span>vs Budget</span>
                <span style={{
                  color: forecastMonthlyCredits > monthlyBudget ? '#ef4444' : '#059669',
                  fontWeight: 700,
                }}>
                  {forecastMonthlyCredits > monthlyBudget
                    ? `${(forecastMonthlyCredits - monthlyBudget).toFixed(1)}`
                    : `${(monthlyBudget - forecastMonthlyCredits).toFixed(1)}`}
                </span>
              </div>
            )}
          </div>
          <div className="insight-stat-note">At current avg pace</div>
        </div>
      )}

      {/* Avg Daily Spend Card — credits only */}
      {!useRateCredits && allTimeAvgDailyCredits !== null && (
        <div className="insight-stat-card insights-card">
          <div className="insight-stat-label">Avg Daily Spend</div>
          <div className="insight-stat-value" style={{ color: '#0891b2' }}>
            {allTimeAvgDailyCredits.toFixed(2)}
            <span className="insight-stat-unit">credits</span>
          </div>
          <div className="insight-stat-sub">
            <div className="insight-stat-row">
              <span>Per week</span>
              <span style={{ color: '#0891b2', fontWeight: 700 }}>{(allTimeAvgDailyCredits * 7).toFixed(1)}</span>
            </div>
            <div className="insight-stat-row">
              <span>Per month</span>
              <span style={{ color: '#0891b2', fontWeight: 700 }}>{(allTimeAvgDailyCredits * 30).toFixed(1)}</span>
            </div>
          </div>
          <div className="insight-stat-note">Based on all-time data</div>
        </div>
      )}
    </div>
  );
}
