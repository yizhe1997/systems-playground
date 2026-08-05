// Formats a "YYYY-MM-DD" input date as "DD.MM.YYYY" for display. Falls back
// to the raw string on anything unparseable so a malformed admin entry
// degrades to visible-but-odd rather than crashing the page.
export function formatPublishedDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
