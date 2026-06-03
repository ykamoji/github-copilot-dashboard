'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getModelColor } from '@/utils/controlHelpers';

interface RecordType {
  model: string;
  date?: string;
  credit_rate?: number | null;
  credits?: number | null;
  [key: string]: any;
}

interface PivotRow {
  date: string;
  [model: string]: any;
}

/**
 * Groups records by date and pivots models into columns.
 * Returns [{ date, "Model A": 1.2, "Model B": 0.5 }, ...]
 */
function pivotByDate(records: RecordType[], creditField: 'credit_rate' | 'credits', modelList: string[]): PivotRow[] {
  const byDate: Record<string, PivotRow> = {};

  for (const r of records) {
    const d = r.date;
    if (!d) continue;

    const val = r[creditField];
    if (val == null) continue;

    if (!byDate[d]) byDate[d] = { date: d };
    byDate[d][r.model] = (byDate[d][r.model] || 0) + val;
  }

  // Round values
  for (const row of Object.values(byDate)) {
    for (const m of modelList) {
      if (row[m] != null) row[m] = Math.round(row[m] * 100) / 100;
    }
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

interface CreditsLineChartProps {
  data: RecordType[];
  models: string[];
  useRateCredits: boolean;
}

export default function CreditsLineChart({ data, models, useRateCredits }: CreditsLineChartProps) {
  const creditField = useRateCredits ? 'credit_rate' : 'credits';

  // Filter to records that actually have the chosen credit type
  const filtered = data.filter((r) => r[creditField] != null);
  const chartData = pivotByDate(filtered, creditField, models);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="custom-tooltip">
        <div className="label">{label}</div>
        {payload.map((entry, i) => (
          <div key={i} className="entry">
            <span className="dot" style={{ background: entry.color }} />
            <span>{entry.name}:&nbsp;<strong>{Number(entry.value).toFixed(2)}{useRateCredits ? 'x' : ''}</strong></span>
          </div>
        ))}
      </div>
    );
  };

  // Determine which models actually appear in the data
  const activeModels = models.filter((m) => chartData.some((row) => row[m] != null));

  if (chartData.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Credits Over Time (Daily)</div>
        <div className="state-message">
          No {useRateCredits ? 'rate' : 'absolute'} credit data for the selected filters.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">
        {useRateCredits ? 'Rate Credits (×)' : 'Absolute Credits'} — Daily Trend
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingTop: 12, fontSize: '0.8rem' }}
            />
            {activeModels.map((model, i) => (
              <Line
                key={model}
                type="monotone"
                dataKey={model}
                stroke={getModelColor(models.indexOf(model))}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 0, fill: getModelColor(models.indexOf(model)) }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
