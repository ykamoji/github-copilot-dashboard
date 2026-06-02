'use client';

import { useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ZAxis,
} from 'recharts';
import { getModelColor } from '../controls/Controls';
import { formatTokens } from '../../types';

interface RecordType {
  model: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  thinking_tokens?: number | null;
  time_taken?: number | null;
  [key: string]: any;
}

interface PerformanceScatterProps {
  data: RecordType[];
  models: string[];
}

type SizeMetric = 'output_tokens' | 'thinking_tokens';

interface ScatterPoint {
  x: number;
  y: number;
  size: number;
  model: string;
  input_tokens: number;
  output_tokens: number;
  thinking_tokens: number;
  time_taken: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as ScatterPoint;
  if (!point) return null;

  return (
    <div className="custom-tooltip">
      <div className="label" style={{ marginBottom: '6px' }}>{point.model}</div>
      <div className="entry">
        <span className="dot" style={{ background: '#6366f1' }} />
        <span>Input Tokens:&nbsp;<strong>{point.input_tokens.toLocaleString()}</strong></span>
      </div>
      <div className="entry">
        <span className="dot" style={{ background: '#f59e0b' }} />
        <span>Time Taken:&nbsp;<strong>{point.time_taken.toFixed(1)}s</strong></span>
      </div>
      <div className="entry">
        <span className="dot" style={{ background: '#06b6d4' }} />
        <span>Output Tokens:&nbsp;<strong>{point.output_tokens.toLocaleString()}</strong></span>
      </div>
      <div className="entry">
        <span className="dot" style={{ background: '#8b5cf6' }} />
        <span>Thinking Tokens:&nbsp;<strong>{point.thinking_tokens.toLocaleString()}</strong></span>
      </div>
    </div>
  );
}

export default function PerformanceScatter({ data, models }: PerformanceScatterProps) {
  const [sizeMetric, setSizeMetric] = useState<SizeMetric>('output_tokens');

  // Build scatter data grouped by model
  const modelData: Record<string, ScatterPoint[]> = {};

  for (const m of models) {
    modelData[m] = [];
  }

  for (const r of data) {
    if (!r.model || !modelData[r.model]) continue;
    if (r.input_tokens == null || r.time_taken == null) continue;
    if (r.input_tokens === 0 && r.time_taken === 0) continue;

    const sizeVal = (r[sizeMetric] as number) || 0;

    modelData[r.model].push({
      x: r.input_tokens || 0,
      y: typeof r.time_taken === 'number' ? r.time_taken : 0,
      size: Math.max(sizeVal, 1), // min size 1 for visibility
      model: r.model,
      input_tokens: r.input_tokens || 0,
      output_tokens: r.output_tokens || 0,
      thinking_tokens: r.thinking_tokens || 0,
      time_taken: typeof r.time_taken === 'number' ? r.time_taken : 0,
    });
  }

  // Filter to models that actually have points
  const activeModels = models.filter((m) => modelData[m].length > 0);

  // Find max size value for ZAxis domain
  const allPoints = activeModels.flatMap((m) => modelData[m]);
  const maxSize = Math.max(...allPoints.map((p) => p.size), 1);

  if (allPoints.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Performance Scatter Plot</div>
        <div className="state-message">No performance data available for the selected filters.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '4px' }}>
        <div className="card-title" style={{ marginBottom: 0 }}>
          Performance Scatter — Input Tokens vs Response Time
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Bubble size:
          </span>
          <div className="button-group" style={{ padding: '2px' }}>
            <button
              className={`btn-preset ${sizeMetric === 'output_tokens' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => setSizeMetric('output_tokens')}
            >
              Output
            </button>
            <button
              className={`btn-preset ${sizeMetric === 'thinking_tokens' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => setSizeMetric('thinking_tokens')}
            >
              Thinking
            </button>
          </div>
        </div>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              type="number"
              dataKey="x"
              name="Input Tokens"
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickFormatter={(v: number) => formatTokens(v)}
              label={{
                value: 'Input Tokens',
                position: 'insideBottomRight',
                offset: -4,
                fill: '#64748b',
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Time Taken (s)"
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={55}
              tickFormatter={(v: number) => `${v.toFixed(0)}s`}
              label={{
                value: 'Time (s)',
                angle: -90,
                position: 'insideLeft',
                offset: 12,
                fill: '#64748b',
                fontSize: 11,
              }}
            />
            <ZAxis
              type="number"
              dataKey="size"
              range={[30, 400]}
              domain={[0, maxSize]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingTop: 12, fontSize: '0.8rem' }}
            />
            {activeModels.map((model) => (
              <Scatter
                key={model}
                name={model}
                data={modelData[model]}
                fill={getModelColor(models.indexOf(model))}
                fillOpacity={0.7}
                strokeWidth={1}
                stroke={getModelColor(models.indexOf(model))}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
