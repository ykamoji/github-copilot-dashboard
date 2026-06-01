'use client';

import { useState, useRef, useEffect } from 'react';

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
  return (
    <div className="card controls-panel">
      <MultiSelect
        label="Models"
        options={models}
        selected={selectedModels}
        onChange={onModelsChange}
      />

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

      <div className="control-group" style={{ justifyContent: 'flex-end' }}>
        <Toggle
          id="toggle-session"
          label="Group by Session"
          checked={groupBySession}
          onChange={onGroupBySessionChange}
        />
      </div>

      <div className="control-group" style={{ justifyContent: 'flex-end' }}>
        <Toggle
          id="toggle-credit-type"
          label={useRateCredits ? 'Rate Credits (×)' : 'Absolute Credits'}
          checked={useRateCredits}
          onChange={onCreditTypeChange}
        />
      </div>
    </div>
  );
}
