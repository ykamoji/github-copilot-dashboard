'use client';

import { useState, useMemo, useEffect } from 'react';
import Dropdown from './Dropdown';
import './Controls.css';
import {
  formatDate,
  getThisWeek,
  getThisMonth,
  getLast30Days,
  parseLocalDate,
  getMonthLabel,
  getWeekLabel,
  getMonthOptions,
  getWeekOptionsForMonth
} from '../../utils/controlHelpers';


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
  const [showAdvanced, setShowAdvanced] = useState(() => {
    const w = getThisWeek();
    const m = getThisMonth();
    const l = getLast30Days();
    const isPreset = (startDate === w.start && endDate === w.end) ||
      (startDate === m.start && endDate === m.end) ||
      (startDate === l.start && endDate === l.end);
    return !isPreset;
  });
  const monthOptions = useMemo(() => getMonthOptions(), []);

  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const isStartFirst = start.getDate() === 1;
    const isEndLast = end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();

    if (isStartFirst && isEndLast) {
      const selected = [];
      let current = new Date(start);
      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        selected.push(`${y}-${m}`);
        current.setDate(1);
        current.setMonth(current.getMonth() + 1);
      }
      return selected;
    }
    return [];
  });

  useEffect(() => {
    if (selectedMonths.length === 0) return;
    const sorted = [...selectedMonths].sort();
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const [fy, fm] = first.split('-');
    const monthBoundStart = new Date(Number(fy), Number(fm) - 1, 1);

    const [ly, lm] = last.split('-');
    const monthBoundEnd = new Date(Number(ly), Number(lm), 0);

    const currentStart = parseLocalDate(startDate);
    const currentEnd = parseLocalDate(endDate);

    // If the date range is within the selected month(s), keep the selection
    // (this happens when picking a week within the month)
    if (currentStart >= monthBoundStart && currentEnd <= monthBoundEnd) {
      return;
    }

    // Dates changed to something outside the selected months — re-derive
    const start = new Date(startDate);
    const end = new Date(endDate);
    const isStartFirst = start.getDate() === 1;
    const isEndLast = end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();

    if (isStartFirst && isEndLast) {
      const selected = [];
      let current = new Date(start);
      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        selected.push(`${y}-${m}`);
        current.setDate(1);
        current.setMonth(current.getMonth() + 1);
      }
      setSelectedMonths(selected.filter(s => monthOptions.some(o => o.value === s)));
    } else {
      setSelectedMonths([]);
    }
  }, [startDate, endDate, monthOptions]);

  const handleMonthsChange = (months: string[]) => {
    setSelectedMonths(months);
    if (months.length === 0) {
      const m = getThisMonth();
      onStartChange(m.start);
      onEndChange(m.end);
      return;
    }
    const sorted = [...months].sort();
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const [fy, fm] = first.split('-');
    const start = new Date(Number(fy), Number(fm) - 1, 1);

    const [ly, lm] = last.split('-');
    const end = new Date(Number(ly), Number(lm), 0);

    onStartChange(formatDate(start));
    onEndChange(formatDate(end));
  };

  const monthDisplayText = selectedMonths.length === 0
    ? 'Month'
    : selectedMonths.length === 1
      ? getMonthLabel(selectedMonths[0] + '-01')
      : selectedMonths.length === monthOptions.length
        ? 'All Months'
        : `${selectedMonths.length} Months`;

  const weekOptions = selectedMonths.length === 1 ? getWeekOptionsForMonth(selectedMonths[0]) : [];

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
        <div className="control-group">
          <label>Models</label>
          <Dropdown
            mode="multi"
            displayText={
              selectedModels.length === 0 || selectedModels.length === models.length
                ? 'All Models'
                : selectedModels.length <= 2
                  ? selectedModels.join(', ')
                  : `${selectedModels.length} selected`
            }
            options={models.map((m) => ({ label: m, value: m }))}
            selected={selectedModels}
            onChange={onModelsChange}
          />
        </div>

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
              <Dropdown
                mode="multi"
                variant="compact"
                allowMultiToggle
                displayText={monthDisplayText}
                options={monthOptions}
                selected={selectedMonths}
                onChange={handleMonthsChange}
              />
            </div>

            {/* Week Navigation */}
            <div className="button-group" style={{ opacity: selectedMonths.length === 1 ? 1 : 0.5, pointerEvents: selectedMonths.length === 1 ? 'auto' : 'none' }}>
              <Dropdown
                mode="single"
                variant="compact"
                displayText={getWeekLabel(startDate, endDate)}
                options={weekOptions}
                selected={`${startDate}|${endDate}`}
                onChange={(val) => {
                  const [startStr, endStr] = val.split('|');
                  onStartChange(startStr);
                  onEndChange(endStr);
                }}
              />
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
