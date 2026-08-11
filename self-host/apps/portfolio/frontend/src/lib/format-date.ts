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

// Splits a "YYYY-MM-DD" input date into the two lines shown on the blog
// card's postmark stamp badge - "DD MON" plus a separate year line. Returns
// null (renders no badge) on blank/unparseable input, same degrade-safe
// convention as formatPublishedDate.
export function formatPostmarkStamp(dateStr: string): { dayMonth: string; year: string } | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, '0');
  const mon = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  return { dayMonth: `${dd} ${mon}`, year: String(d.getFullYear()) };
}
