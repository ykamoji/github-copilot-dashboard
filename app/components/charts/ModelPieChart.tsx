'use client';

import { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getModelColor } from '../controls/Controls';
import { formatTokens } from '../../types';

interface RecordType {
  model: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  thinking_tokens?: number | null;
  time_taken?: number | null;
  credits?: number | null;
  credit_rate?: number | null;
  [key: string]: any;
}

interface ModelPieChartProps {
  data: RecordType[];
  models: string[];
  useRateCredits: boolean;
}

type PieMetric = 'runs' | 'input_tokens' | 'output_tokens' | 'thinking_tokens' | 'credits' | 'normalized_time';

const METRIC_LABELS: Record<PieMetric, string> = {
  runs: 'Number of Runs',
  input_tokens: 'Input Tokens',
  output_tokens: 'Output Tokens',
  thinking_tokens: 'Thinking Tokens',
  credits: 'AI Credits',
  normalized_time: 'Avg Response Time / 1k Tokens',
};

export default function ModelPieChart({ data, models, useRateCredits }: ModelPieChartProps) {
  const [metric, setMetric] = useState<PieMetric>('credits');

  // Group and aggregate data by model
  const aggregates: Record<string, {
    runs: number;
    input_tokens: number;
    output_tokens: number;
    thinking_tokens: number;
    credits: number;
    total_time: number;
  }> = {};

  for (const m of models) {
    aggregates[m] = {
      runs: 0,
      input_tokens: 0,
      output_tokens: 0,
      thinking_tokens: 0,
      credits: 0,
      total_time: 0,
    };
  }

  for (const r of data) {
    if (!r.model || !aggregates[r.model]) continue;
    aggregates[r.model].runs += 1;
    aggregates[r.model].input_tokens += r.input_tokens || 0;
    aggregates[r.model].output_tokens += r.output_tokens || 0;
    aggregates[r.model].thinking_tokens += r.thinking_tokens || 0;
    aggregates[r.model].credits += useRateCredits ? (r.credit_rate || 0) : (r.credits || 0);
    aggregates[r.model].total_time += typeof r.time_taken === 'number' ? r.time_taken : 0;
  }

  // Compute final values for each model
  const chartData = models
    .map((m) => {
      const agg = aggregates[m];
      let value = 0;

      if (metric === 'runs') {
        value = agg.runs;
      } else if (metric === 'input_tokens') {
        value = agg.input_tokens;
      } else if (metric === 'output_tokens') {
        value = agg.output_tokens;
      } else if (metric === 'thinking_tokens') {
        value = agg.thinking_tokens;
      } else if (metric === 'credits') {
        value = agg.credits;
      } else if (metric === 'normalized_time') {
        // Seconds per 1k input tokens
        value = agg.input_tokens > 0 ? (agg.total_time / agg.input_tokens) * 1000 : 0;
      }

      return {
        name: m,
        value: Number(value.toFixed(2)),
        raw: agg, // keep for tooltips
      };
    })
    .filter((item) => item.value > 0);

  const totalVal = chartData.reduce((acc, curr) => acc + curr.value, 0);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const entry = payload[0];
    const percentage = totalVal > 0 ? ((entry.value / totalVal) * 100).toFixed(1) : '0.0';

    let displayVal = entry.value.toLocaleString();
    if (metric === 'input_tokens' || metric === 'output_tokens' || metric === 'thinking_tokens') {
      displayVal = formatTokens(entry.value);
    } else if (metric === 'normalized_time') {
      displayVal = `${entry.value.toFixed(3)}s / 1k tokens`;
    } else if (metric === 'credits') {
      displayVal = `${entry.value.toFixed(2)}${useRateCredits ? 'x' : ''}`;
    }

    return (
      <div className="custom-tooltip">
        <div className="label" style={{ borderBottom: `2px solid ${entry.payload.fill || entry.color}`, paddingBottom: '4px', marginBottom: '6px' }}>
          {entry.name}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
          Value: <strong>{displayVal}</strong>
        </div>
        {metric !== 'normalized_time' && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Share: <strong>{percentage}%</strong>
          </div>
        )}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Model Distribution</div>
        <div className="state-message">No model data available for the selected filters.</div>
      </div>
    );
  }

  // Format values for the legend
  const renderLegendText = (value: string, entry: any) => {
    const item = chartData.find((d) => d.name === value);
    if (!item) return value;
    const percentage = totalVal > 0 ? ((item.value / totalVal) * 100).toFixed(0) : '0';
    return (
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
        {value} {metric !== 'normalized_time' && `(${percentage}%)`}
      </span>
    );
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div className="card-title" style={{ marginBottom: 0 }}>
          Model Distribution
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as PieMetric)}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              padding: '6px 12px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {Object.entries(METRIC_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="chart-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={105}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getModelColor(models.indexOf(entry.name))}
                  stroke="var(--bg-card)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={renderLegendText}
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
