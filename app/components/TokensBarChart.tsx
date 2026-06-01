'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  TooltipProps
} from 'recharts';

const TOKEN_COLORS: Record<string, string> = {
  input_tokens: '#6366f1',
  output_tokens: '#06b6d4',
  thinking_tokens: '#8b5cf6',
};

const TOKEN_LABELS: Record<string, string> = {
  input_tokens: 'Input Tokens',
  output_tokens: 'Output Tokens',
  thinking_tokens: 'Thinking Tokens',
};

/* ── Custom Tooltip ── */
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="entry">
          <span className="dot" style={{ background: entry.color || entry.fill }} />
          <span>{entry.name}:&nbsp;<strong>{Number(entry.value).toLocaleString()}</strong></span>
        </div>
      ))}
    </div>
  );
}

interface RecordType {
  model: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  thinking_tokens?: number | null;
  [key: string]: any;
}

interface AggregatedTokens {
  model: string;
  input_tokens: number;
  output_tokens: number;
  thinking_tokens: number;
}

/**
 * Aggregate tokens per model.
 * Returns [{ model, input_tokens, output_tokens, thinking_tokens }, ...]
 */
function aggregateTokens(records: RecordType[], models: string[]): AggregatedTokens[] {
  const agg: Record<string, AggregatedTokens> = {};
  for (const m of models) {
    agg[m] = { model: m, input_tokens: 0, output_tokens: 0, thinking_tokens: 0 };
  }

  for (const r of records) {
    if (!r.model || !agg[r.model]) continue;
    // Only include records that have at least some token data
    if (r.input_tokens == null && r.output_tokens == null && r.thinking_tokens == null) continue;
    agg[r.model].input_tokens += r.input_tokens || 0;
    agg[r.model].output_tokens += r.output_tokens || 0;
    agg[r.model].thinking_tokens += r.thinking_tokens || 0;
  }

  return Object.values(agg).filter(
    (row) => row.input_tokens > 0 || row.output_tokens > 0 || row.thinking_tokens > 0
  );
}

interface TokensBarChartProps {
  data: RecordType[];
  models: string[];
}

export default function TokensBarChart({ data, models }: TokensBarChartProps) {
  const chartData = aggregateTokens(data, models);

  if (chartData.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Tokens per Model</div>
        <div className="state-message">No token data available for the selected filters.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">Tokens per Model</div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="model"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={65}
              tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="square"
              iconSize={10}
              wrapperStyle={{ paddingTop: 12, fontSize: '0.8rem' }}
            />
            <Bar
              dataKey="input_tokens"
              name={TOKEN_LABELS.input_tokens}
              fill={TOKEN_COLORS.input_tokens}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="output_tokens"
              name={TOKEN_LABELS.output_tokens}
              fill={TOKEN_COLORS.output_tokens}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="thinking_tokens"
              name={TOKEN_LABELS.thinking_tokens}
              fill={TOKEN_COLORS.thinking_tokens}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
