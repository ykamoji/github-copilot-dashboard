'use client';

import { useState } from 'react';

interface RecordType {
  timestamp?: string | null;
  [key: string]: any;
}

interface UsageHeatmapProps {
  data: RecordType[];
}

type ViewType = 'hourly' | 'daily';

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getMondayOfDate = (dateStr: string): Date => {
  const d = parseLocalDate(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
};

const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDateLabel = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [, month, day] = parts;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(month, 10) - 1;
  const nextMondayDay = parseInt(day) + 6;
  return `${months[monthIdx]} ${day} - ${nextMondayDay}`;
};

const formatFullDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
};

const formatHourLabel = (hour: number) => {
  if (hour === 0) return '12a';
  if (hour === 12) return '12p';
  return hour > 12 ? `${hour - 12}p` : `${hour}a`;
};

const formatFullHour = (hour: number) => {
  const start = hour === 0 ? '12:00 AM' : hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
  const nextHour = (hour + 1) % 24;
  const end = nextHour === 0 ? '12:00 AM' : nextHour === 12 ? '12:00 PM' : nextHour > 12 ? `${nextHour - 12}:00 PM` : `${nextHour}:00 AM`;
  return `${start} - ${end}`;
};

export default function UsageHeatmap({ data }: UsageHeatmapProps) {
  const [viewType, setViewType] = useState<ViewType>('daily');
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    hour?: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // ──── 1. HOURLY VIEW DATA PROCESSING ────
  const hourlyGridData: Record<string, number[]> = {};
  const hourlyDatesSet = new Set<string>();

  for (const r of data) {
    if (!r.timestamp || r.timestamp.length < 13) continue;
    const date = r.timestamp.substring(0, 10);
    const hour = parseInt(r.timestamp.substring(11, 13), 10);
    if (isNaN(hour) || hour < 0 || hour > 23) continue;

    hourlyDatesSet.add(date);
    if (!hourlyGridData[date]) {
      hourlyGridData[date] = Array(24).fill(0);
    }
    hourlyGridData[date][hour] += 1;
  }

  const sortedHourlyDates = Array.from(hourlyDatesSet).sort((a, b) => a.localeCompare(b));

  let maxHourlyCount = 0;
  for (const date of sortedHourlyDates) {
    for (let hr = 0; hr < 24; hr++) {
      const val = hourlyGridData[date][hr];
      if (val > maxHourlyCount) maxHourlyCount = val;
    }
  }

  // ──── 2. DAILY VIEW DATA PROCESSING ────
  // We want: Y = Week (represented by the Monday date of that week)
  //          X = Day of week (0=Mon, ..., 6=Sun)
  //          value = run count on that day
  const dailyGridData: Record<string, { counts: number[]; dates: string[] }> = {};
  const weeksSet = new Set<string>();
  let maxDailyCount = 0;

  // Aggregate total runs per date first
  const runsPerDate: Record<string, number> = {};
  for (const r of data) {
    if (!r.timestamp || r.timestamp.length < 10) continue;
    const date = r.timestamp.substring(0, 10);
    runsPerDate[date] = (runsPerDate[date] || 0) + 1;
  }

  // Group dates into weeks
  for (const [dateStr, count] of Object.entries(runsPerDate)) {
    const monday = formatDate(getMondayOfDate(dateStr));
    weeksSet.add(monday);

    if (!dailyGridData[monday]) {
      dailyGridData[monday] = {
        counts: Array(7).fill(0),
        dates: Array(7).fill(''),
      };
    }

    const d = parseLocalDate(dateStr);
    const dayIndex = (d.getDay() + 6) % 7; // Monday is 0, Sunday is 6
    dailyGridData[monday].counts[dayIndex] = count;
    dailyGridData[monday].dates[dayIndex] = dateStr;

    if (count > maxDailyCount) {
      maxDailyCount = count;
    }
  }

  const sortedWeeks = Array.from(weeksSet).sort((a, b) => a.localeCompare(b));

  // If no data
  if (sortedHourlyDates.length === 0 && sortedWeeks.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Activity Heatmap</div>
        <div className="state-message">No timestamp data available for the selected filters.</div>
      </div>
    );
  }

  const handleMouseMove = (e: React.MouseEvent, date: string, count: number, hour?: number) => {
    setHoveredCell({
      date,
      hour,
      count,
      x: e.clientX,
      y: e.clientY
    });
  };

  const displayHours = [0, 3, 6, 9, 12, 15, 18, 21];
  const daysOfWeekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="card-title" style={{ marginBottom: 0 }}>
          Activity Heatmap
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>Fewer</span>
            <div style={{ display: 'flex', gap: '2px' }}>
              <span style={{ width: '8px', height: '8px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '1px', border: '1px solid rgba(255,255,255,0.05)' }} />
              <span style={{ width: '8px', height: '8px', background: 'rgba(99, 102, 241, 0.25)', borderRadius: '1px' }} />
              <span style={{ width: '8px', height: '8px', background: 'rgba(99, 102, 241, 0.55)', borderRadius: '1px' }} />
              <span style={{ width: '8px', height: '8px', background: 'rgba(99, 102, 241, 0.85)', borderRadius: '1px' }} />
            </div>
            <span>More</span>
          </div>

          {/* Toggle buttons */}
          <div className="button-group" style={{ padding: '2px' }}>
            <button
              className={`btn-preset ${viewType === 'daily' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => {
                setViewType('daily');
                setHoveredCell(null);
              }}
            >
              Daily
            </button>
            <button
              className={`btn-preset ${viewType === 'hourly' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => {
                setViewType('hourly');
                setHoveredCell(null);
              }}
            >
              Hourly
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, position: 'relative' }}>
        {viewType === 'hourly' ? (
          /* ──── HOURLY VIEW ──── */
          <>
            {/* Hours Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(24, 1fr)', gap: '3px', marginBottom: '6px' }}>
              <div />
              {Array(24).fill(0).map((_, hr) => (
                <div
                  key={hr}
                  style={{
                    fontSize: '9px',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    userSelect: 'none'
                  }}
                >
                  {displayHours.includes(hr) ? formatHourLabel(hr) : ''}
                </div>
              ))}
            </div>

            {/* Days Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {sortedHourlyDates.map((date) => (
                <div key={date} style={{ display: 'grid', gridTemplateColumns: '70px repeat(24, 1fr)', gap: '3px', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {formatDateLabel(date)}
                  </div>
                  {Array(24).fill(0).map((_, hr) => {
                    const count = hourlyGridData[date][hr] || 0;
                    const opacity = count > 0 ? 0.12 + 0.88 * Math.pow(count / maxHourlyCount, 0.45) : 0.03;
                    const cellBg = count > 0 ? `rgba(99, 102, 241, ${opacity})` : 'rgba(255, 255, 255, 0.03)';
                    const cellBorder = count > 0 ? 'none' : '1px solid rgba(255, 255, 255, 0.04)';

                    return (
                      <div
                        key={hr}
                        onMouseEnter={(e) => handleMouseMove(e, date, count, hr)}
                        onMouseMove={(e) => handleMouseMove(e, date, count, hr)}
                        onMouseLeave={() => setHoveredCell(null)}
                        style={{
                          aspectRatio: '1',
                          background: cellBg,
                          border: cellBorder,
                          borderRadius: '2px',
                          cursor: 'pointer',
                          transition: 'transform 0.1s, box-shadow 0.1s',
                          boxShadow: hoveredCell?.date === date && hoveredCell?.hour === hr ? '0 0 8px var(--accent-indigo)' : 'none',
                          transform: hoveredCell?.date === date && hoveredCell?.hour === hr ? 'scale(1.2)' : 'none',
                          zIndex: hoveredCell?.date === date && hoveredCell?.hour === hr ? 2 : 1
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        ) : (
          /* ──── DAILY VIEW ──── */
          <>
            {/* Days of Week Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
              <div />
              {daysOfWeekLabels.map((lbl) => (
                <div
                  key={lbl}
                  style={{
                    fontSize: '9px',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    fontWeight: 600,
                    userSelect: 'none'
                  }}
                >
                  {lbl}
                </div>
              ))}
            </div>

            {/* Weeks Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sortedWeeks.map((mondayStr) => {
                const weekData = dailyGridData[mondayStr];
                return (
                  <div key={mondayStr} style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)', gap: '4px', alignItems: 'center' }}>
                    {/* Week of label */}
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {formatDateLabel(mondayStr)}
                    </div>
                    {/* 7 Days of that week */}
                    {Array(7).fill(0).map((_, dayIdx) => {
                      const count = weekData.counts[dayIdx] || 0;
                      const dateStr = weekData.dates[dayIdx];
                      const opacity = count > 0 ? 0.12 + 0.88 * Math.pow(count / maxDailyCount, 0.45) : 0.03;
                      const cellBg = count > 0 ? `rgba(99, 102, 241, ${opacity})` : 'rgba(255, 255, 255, 0.03)';
                      const cellBorder = count > 0 ? 'none' : '1px solid rgba(255, 255, 255, 0.04)';

                      // If there is no date associated with this cell (e.g. outside filter date range bounds)
                      if (!dateStr) {
                        return (
                          <div
                            key={dayIdx}
                            style={{
                              aspectRatio: '1',
                              background: 'transparent',
                              border: 'none',
                              borderRadius: '2px',
                            }}
                          />
                        );
                      }

                      return (
                        <div
                          key={dayIdx}
                          onMouseEnter={(e) => handleMouseMove(e, dateStr, count)}
                          onMouseMove={(e) => handleMouseMove(e, dateStr, count)}
                          onMouseLeave={() => setHoveredCell(null)}
                          style={{
                            aspectRatio: '1',
                            background: cellBg,
                            border: cellBorder,
                            borderRadius: '2px',
                            cursor: 'pointer',
                            transition: 'transform 0.1s, box-shadow 0.1s',
                            boxShadow: hoveredCell?.date === dateStr ? '0 0 8px var(--accent-indigo)' : 'none',
                            transform: hoveredCell?.date === dateStr ? 'scale(1.2)' : 'none',
                            zIndex: hoveredCell?.date === dateStr ? 2 : 1
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Floating Tooltip */}
      {hoveredCell && (
        <div
          className="custom-tooltip"
          style={{
            position: 'fixed',
            left: hoveredCell.x + 12,
            top: hoveredCell.y - 12,
            zIndex: 9999,
            pointerEvents: 'none',
            transform: 'translate(0, -100%)',
            whiteSpace: 'nowrap',
            padding: '8px 12px',
            fontSize: '0.8rem'
          }}
        >
          {viewType === 'hourly' ? (
            <>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {formatDateLabel(hoveredCell.date)}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '2px' }}>
                {hoveredCell.hour !== undefined ? formatFullHour(hoveredCell.hour) : ''}
              </div>
            </>
          ) : (
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {formatFullDate(hoveredCell.date)}
            </div>
          )}
          <div style={{ color: 'var(--accent-indigo)', fontWeight: 'bold' }}>
            {hoveredCell.count} run{hoveredCell.count !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
