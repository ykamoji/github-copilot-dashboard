'use client';

import { useState, useRef, useEffect } from 'react';
import './Controls.css';

/* ── Color palette for models ── */
const MODEL_COLORS = [
  '#6366f1', '#06b6d4', '#8b5cf6', '#10b981',
  '#f59e0b', '#f43f5e', '#0ea5e9', '#d946ef', '#84cc16',
];

export function getModelColor(index: number): string {
  return MODEL_COLORS[index % MODEL_COLORS.length];
}

/* ── Helpers ── */
export function formatMonth(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${String(new Date(y, now.getMonth() + 1, 0).getDate()).padStart(2, '0')}` };
}

/* ── Types ── */
interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

/* ── Multi-select Dropdown ── */
function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (val: string) => {
    onChange(
      selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]
    );
  };

  const displayText =
    selected.length === 0 || selected.length === options.length
      ? 'All Models'
      : selected.length <= 2
        ? selected.join(', ')
        : `${selected.length} selected`;

  return (
    <div className="control-group">
      <label>{label}</label>
      <div className="multiselect" ref={ref}>
        <div
          className={`multiselect-trigger ${open ? 'open' : ''}`}
          onClick={() => setOpen(!open)}
        >
          <span>{displayText}</span>
          <span className="arrow">▼</span>
        </div>
        {open && (
          <div className="multiselect-dropdown">
            {options.map((opt) => (
              <div key={opt} className="multiselect-option" onClick={() => toggle(opt)}>
                <input type="checkbox" checked={selected.includes(opt)} readOnly />
                <span>{opt}</span>
              </div>
            ))}
            <div className="multiselect-actions">
              <button onClick={() => onChange([...options])}>Select All</button>
              <button onClick={() => onChange([])}>Clear</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Types ── */
interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}

/* ── Toggle ── */
function Toggle({ label, checked, onChange, id }: ToggleProps) {
  return (
    <div className="toggle-row">
      <label className="toggle-switch" htmlFor={id}>
        <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
      <span className="toggle-label" onClick={() => onChange(!checked)}>{label}</span>
    </div>
  );
}

/* ── Types ── */
interface ControlsProps {
  models: string[];
  selectedModels: string[];
  onModelsChange: (selected: string[]) => void;
  startDate: string;
  endDate: string;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
  groupBySession: boolean;
  onGroupBySessionChange: (group: boolean) => void;
  useRateCredits: boolean;
  onCreditTypeChange: (useRate: boolean) => void;
}

/* ── Main Controls Component ── */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const getThisWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now.setDate(diff));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: formatDate(start), end: formatDate(end) };
};

const getThisMonth = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
};

const getLast30Days = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { start: formatDate(start), end: formatDate(end) };
};

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getMonthLabel = (dateStr: string) => {
  if (!dateStr) return 'Month';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const getWeekLabel = (dateStr: string) => {
  if (!dateStr) return 'Week';
  const d = parseLocalDate(dateStr);
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);

  const monday = new Date(d.getFullYear(), d.getMonth(), diffToMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  const formatMMDD = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    return `${dd}`;
  };

  return `${formatMMDD(monday)} - ${formatMMDD(sunday)}`;
};

/* ── Main Controls Component ── */
export default function Controls({
  models,
  selectedModels,
  onModelsChange,
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  groupBySession,
  onGroupBySessionChange,
  useRateCredits,
  onCreditTypeChange,
}: ControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(() => {
    const w = getThisWeek();
    const m = getThisMonth();
    const l = getLast30Days();
    const isPreset = (startDate === w.start && endDate === w.end) ||
      (startDate === m.start && endDate === m.end) ||
      (startDate === l.start && endDate === l.end);
    return !isPreset;
  });

  const shiftDays = (days: number) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setDate(start.getDate() + days);
    end.setDate(end.getDate() + days);
    onStartChange(formatDate(start));
    onEndChange(formatDate(end));
  };

  const shiftMonths = (months: number) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const isMonthAligned = start.getDate() === 1 &&
      new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate() === end.getDate();

    if (isMonthAligned) {
      const newStart = new Date(start.getFullYear(), start.getMonth() + months, 1);
      const newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 1, 0);
      onStartChange(formatDate(newStart));
      onEndChange(formatDate(newEnd));
    } else {
      start.setMonth(start.getMonth() + months);
      end.setMonth(end.getMonth() + months);
      onStartChange(formatDate(start));
      onEndChange(formatDate(end));
    }
  };

  const thisWeek = getThisWeek();
  const thisMonth = getThisMonth();
  const last30 = getLast30Days();

  const isThisWeekActive = startDate === thisWeek.start && endDate === thisWeek.end;
  const isThisMonthActive = startDate === thisMonth.start && endDate === thisMonth.end;
  const isLast30DaysActive = startDate === last30.start && endDate === last30.end;

  return (
    <div className="card controls-panel">
      {/* Top Row: Models selector on left, Toggles on right */}
      <div className="controls-row-top">
        <MultiSelect
          label="Models"
          options={models}
          selected={selectedModels}
          onChange={onModelsChange}
        />

        <div className="toggles-group">
          <Toggle
            id="toggle-session"
            label="Group by Session"
            checked={groupBySession}
            onChange={onGroupBySessionChange}
          />
          <Toggle
            id="toggle-credit-type"
            label={useRateCredits ? 'Rate Credits (×)' : 'Absolute Credits'}
            checked={useRateCredits}
            onChange={onCreditTypeChange}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="controls-divider"></div>

      {/* Bottom Row: Date selection & Custom Range */}
      <div className="controls-row-date">
        <div className="control-group date-control-group">
          <label>Date Range</label>
          <div className="date-nav-preset-row">
            {/* Month Navigation */}
            <div className="button-group">
              <button className="btn-preset btn-nav-arrow" onClick={() => shiftMonths(-1)} title="Previous Month">◀</button>
              <button className="btn-preset btn-nav-label" style={{ pointerEvents: 'none', color: 'var(--text-muted)' }}>
                {getMonthLabel(startDate)}
              </button>
              <button className="btn-preset btn-nav-arrow" onClick={() => shiftMonths(1)} title="Next Month">▶</button>
            </div>

            {/* Week Navigation */}
            <div className="button-group">
              <button className="btn-preset btn-nav-arrow" onClick={() => shiftDays(-7)} title="Previous Week">◀</button>
              <button className="btn-preset btn-nav-label" style={{ pointerEvents: 'none', color: 'var(--text-muted)' }}>
                {getWeekLabel(startDate)}
              </button>
              <button className="btn-preset btn-nav-arrow" onClick={() => shiftDays(7)} title="Next Week">▶</button>
            </div>

            {/* Presets Segment */}
            <div className="button-group">
              <button
                className={`btn-preset ${isThisWeekActive ? 'active' : ''}`}
                onClick={() => {
                  onStartChange(thisWeek.start);
                  onEndChange(thisWeek.end);
                }}
              >
                This Week
              </button>
              <button
                className={`btn-preset ${isThisMonthActive ? 'active' : ''}`}
                onClick={() => {
                  onStartChange(thisMonth.start);
                  onEndChange(thisMonth.end);
                }}
              >
                This Month
              </button>
              <button
                className={`btn-preset ${isLast30DaysActive ? 'active' : ''}`}
                onClick={() => {
                  onStartChange(last30.start);
                  onEndChange(last30.end);
                }}
              >
                Last 30 Days
              </button>
              <button
                className={`btn-preset btn-advanced-toggle ${showAdvanced ? 'active' : ''}`}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                Custom &nbsp; 📅
              </button>
            </div>
          </div>
        </div>

        {showAdvanced && (
          <div className="custom-date-pickers animate-slide-down">
            <div className="control-group">
              <label>Start Date</label>
              <input
                type="date"
                className="input-date"
                value={startDate}
                onChange={(e) => onStartChange(e.target.value)}
              />
            </div>

            <div className="control-group">
              <label>End Date</label>
              <input
                type="date"
                className="input-date"
                value={endDate}
                onChange={(e) => onEndChange(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
