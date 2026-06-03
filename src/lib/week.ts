// Monday-as-week-start helpers, all in local time.

export function startOfWeek(d: Date = new Date()): Date {
  const day = d.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function endOfWeek(d: Date = new Date()): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

// Whether an ISO date (YYYY-MM-DD) falls in the same calendar month as `ref`.
export function sameMonth(iso: string, ref: Date = new Date()): boolean {
  const [y, m] = iso.split("-").map(Number);
  return y === ref.getFullYear() && m === ref.getMonth() + 1;
}

export function monthLabel(ref: Date = new Date()): string {
  return ref.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
