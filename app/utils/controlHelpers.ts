/* ── Color palette for models ── */
export const MODEL_COLORS = [
  '#6366f1', '#06b6d4', '#8b5cf6', '#10b981',
  '#f59e0b', '#f43f5e', '#0ea5e9', '#d946ef', '#84cc16',
];

export function getModelColor(index: number): string {
  return MODEL_COLORS[index % MODEL_COLORS.length];
}

/* ── Date Helpers ── */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatMonth(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${String(new Date(y, now.getMonth() + 1, 0).getDate()).padStart(2, '0')}` };
}

export const getThisWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now.setDate(diff));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: formatDate(start), end: formatDate(end) };
};

export const getThisMonth = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
};

export const getLast30Days = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { start: formatDate(start), end: formatDate(end) };
};

export const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const getMonthLabel = (dateStr: string) => {
  if (!dateStr) return 'Month';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

export const getWeekLabel = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return 'Week';
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  return `${String(start.getDate()).padStart(2, '0')} ${start.toLocaleDateString('en-US', { month: 'short' })} - ${String(end.getDate()).padStart(2, '0')} ${end.toLocaleDateString('en-US', { month: 'short' })}`;
};

/* ── Options Generators ── */
export const getMonthOptions = () => {
  const opts = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < 12; i++) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const val = `${y}-${m}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    opts.push({ label, value: val });
    d.setMonth(d.getMonth() - 1);
  }
  return opts;
};

export const getWeekOptionsForMonth = (monthStr: string) => {
  const opts = [];
  const [y, m] = monthStr.split('-');
  const monthStart = new Date(Number(y), Number(m) - 1, 1);
  const monthEnd = new Date(Number(y), Number(m), 0);

  const day = monthStart.getDay();
  const diff = monthStart.getDate() - day + (day === 0 ? -6 : 1);
  const d = new Date(monthStart);
  d.setDate(diff);

  while (d <= monthEnd) {
    const start = new Date(d);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    if (start <= monthEnd && end >= monthStart) {
      const startStr = formatDate(start);
      const endStr = formatDate(end);

      const label = `${String(start.getDate()).padStart(2, '0')} ${start.toLocaleDateString('en-US', { month: 'short' })} - ${String(end.getDate()).padStart(2, '0')} ${end.toLocaleDateString('en-US', { month: 'short' })}`;
      opts.push({ label, value: `${startStr}|${endStr}` });
    }
    d.setDate(d.getDate() + 7);
  }
  return opts;
};
