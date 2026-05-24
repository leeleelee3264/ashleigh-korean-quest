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

// Streak: number of consecutive past weeks (including this one)
// where the student met WEEKLY_GOAL approved submissions.
export function calcStreak(weekStartsApproved: string[], weeklyGoal: number): number {
  const counts = new Map<string, number>();
  for (const w of weekStartsApproved) counts.set(w, (counts.get(w) ?? 0) + 1);

  let streak = 0;
  const cursor = startOfWeek();
  while (true) {
    const key = toISODate(cursor);
    if ((counts.get(key) ?? 0) >= weeklyGoal) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 7);
    } else {
      // Allow current week to be in progress without breaking streak.
      if (streak === 0 && key === toISODate(startOfWeek())) {
        cursor.setDate(cursor.getDate() - 7);
        continue;
      }
      break;
    }
  }
  return streak;
}
