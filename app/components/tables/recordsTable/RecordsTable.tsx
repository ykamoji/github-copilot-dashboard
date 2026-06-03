'use client';

import { useState, useMemo } from 'react';
import { UsageRecord } from '@/types';
import './RecordsTable.css';

type SortKey = 'timestamp' | 'model' | 'credits' | 'time_taken' | 'input_tokens' | 'output_tokens' | 'thinking_tokens' | 'session_id';
type SortDir = 'asc' | 'desc';

interface RecordsTableProps {
  data: UsageRecord[];
  useRateCredits: boolean;
}

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'timestamp', label: 'Date Time' },
  { key: 'model', label: 'Model' },
  { key: 'credits', label: 'Credits', align: 'right' },
  { key: 'time_taken', label: 'Response Time', align: 'right' },
  { key: 'input_tokens', label: 'Input Tokens', align: 'right' },
  { key: 'output_tokens', label: 'Output Tokens', align: 'right' },
  { key: 'thinking_tokens', label: 'Thinking Tokens', align: 'right' },
  { key: 'session_id', label: 'Session ID' },
];

export default function RecordsTable({ data, useRateCredits }: RecordsTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Default direction per column type
      const textCols: SortKey[] = ['model', 'session_id'];
      setSortDir(textCols.includes(key) ? 'asc' : 'desc');
    }
  };

  const sortedData = useMemo(() => {
    const rows = [...data];
    rows.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortKey === 'credits') {
        valA = useRateCredits ? (a.credit_rate ?? 0) : (a.credits ?? 0);
        valB = useRateCredits ? (b.credit_rate ?? 0) : (b.credits ?? 0);
      } else {
        valA = (a as any)[sortKey] ?? '';
        valB = (b as any)[sortKey] ?? '';
      }

      // String compare for text columns
      if (sortKey === 'model' || sortKey === 'session_id' || sortKey === 'timestamp') {
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        const cmp = strA.localeCompare(strB);
        return sortDir === 'asc' ? cmp : -cmp;
      }

      // Numeric compare
      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return sortDir === 'asc' ? numA - numB : numB - numA;
    });
    return rows;
  }, [data, sortKey, sortDir, useRateCredits]);

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return <span className="sort-indicator muted">⇅</span>;
    return (
      <span className="sort-indicator active">
        {sortDir === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const formatCredits = (row: UsageRecord) => {
    if (useRateCredits) {
      return row.credit_rate != null ? `${row.credit_rate}x` : '—';
    }
    return row.credits != null ? row.credits.toFixed(2) : '—';
  };

  const formatTokens = (val: number | null) => {
    if (val == null) return '—';
    return val.toLocaleString();
  };

  const formatTime = (val: any) => {
    if (val == null) return '—';
    return `${Number(val).toFixed(1)}s`;
  };

  return (
    <div className="records-table-wrapper">
      {/* Collapsible header */}
      <button
        className="records-table-toggle"
        onClick={() => setIsExpanded(prev => !prev)}
        aria-expanded={isExpanded}
      >
        <div className="records-table-toggle-left">
          <span className={`records-chevron ${isExpanded ? 'expanded' : ''}`}>›</span>
          <span className="records-table-toggle-title">Individual Records</span>
          <span className="records-table-count">{data.length} records</span>
        </div>
        <span className="records-table-hint">{isExpanded ? 'Click to collapse' : 'Click to expand'}</span>
      </button>

      {/* Table body (collapsible) */}
      <div className={`records-table-body ${isExpanded ? 'expanded' : ''}`}>
        <div className="records-table-scroll">
          <table className="records-table">
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className={`sortable-th ${col.align === 'right' ? 'align-right' : ''}`}
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="th-content">
                      {col.label}
                      {getSortIndicator(col.key)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, i) => (
                <tr key={i}>
                  <td className="cell-timestamp">{row.timestamp || '—'}</td>
                  <td>
                    <span className="model-badge">{row.model || '—'}</span>
                  </td>
                  <td className="align-right mono">{formatCredits(row)}</td>
                  <td className="align-right mono">{formatTime(row.time_taken)}</td>
                  <td className="align-right mono">{formatTokens(row.input_tokens)}</td>
                  <td className="align-right mono">{formatTokens(row.output_tokens)}</td>
                  <td className="align-right mono">{formatTokens(row.thinking_tokens)}</td>
                  <td className="cell-session">{row.session_id || '—'}</td>
                </tr>
              ))}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
