// Shared by Experience and Education sections - both store "YYYY-MM" strings
// (empty end = ongoing) and need the same "Jan 2024 - Present · 2y 3m" display,
// so the formatting logic lives in one place rather than twice.

export function formatMonthYear(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return '';
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function formatDuration(start: string, end: string): string {
  if (!start) return '';
  const [sy, sm] = start.split('-').map(Number);
  if (!sy || !sm) return '';

  const now = new Date();
  const [ey, em] = end ? end.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
  if (!ey || !em) return '';

  let months = (ey - sy) * 12 + (em - sm) + 1;
  if (months < 1) months = 1;

  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (remMonths > 0 || years === 0) parts.push(`${remMonths}m`);
  return parts.join(' ');
}

export function formatDateRange(start: string, end: string): string {
  const startLabel = formatMonthYear(start);
  if (!startLabel) return '';
  const endLabel = end ? formatMonthYear(end) : 'Present';
  return `${startLabel} — ${endLabel}`;
}
