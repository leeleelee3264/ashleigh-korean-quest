import { useMemo } from "react";
import type { Submission } from "../types";
import { startOfWeek, toISODate } from "../lib/week";

const HALF = 3; // weeks shown before and after the current week → 7 rows, today centered
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

type DayCell = {
  date: Date;
  iso: string;
  subs: Submission[];
};

function cellTone(subs: Submission[]) {
  if (subs.length === 0) return "bg-white";
  if (subs.some((s) => s.status === "approved")) return "bg-quest-mint";
  return "bg-quest-gold/70";
}

export function QuestCalendar({ submissions }: { submissions: Submission[] }) {
  const rows = useMemo(() => {
    const byDate = new Map<string, Submission[]>();
    for (const s of submissions) {
      const iso = s.submitted_at.slice(0, 10);
      if (!byDate.has(iso)) byDate.set(iso, []);
      byDate.get(iso)!.push(s);
    }

    const out: { weekStart: Date; days: DayCell[] }[] = [];
    for (let i = -HALF; i <= HALF; i++) {
      const weekStart = startOfWeek();
      weekStart.setDate(weekStart.getDate() + i * 7);
      const days: DayCell[] = [];
      for (let j = 0; j < 7; j++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + j);
        const iso = toISODate(d);
        days.push({ date: d, iso, subs: byDate.get(iso) ?? [] });
      }
      out.push({ weekStart, days });
    }
    return out;
  }, [submissions]);

  const todayISO = toISODate(new Date());

  return (
    <section className="pixel-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm sm:text-base">🗓️ Quest calendar</h2>
        <span className="text-[10px] text-quest-ink/60">today is centered</span>
      </div>

      <div className="overflow-x-auto">
        <table className="border-separate mx-auto" style={{ borderSpacing: "4px" }}>
          <thead>
            <tr>
              <th className="w-16" />
              {DAY_LABELS.map((d, i) => (
                <th key={i} className="text-[10px] font-pixel text-quest-ink/60 w-9">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ weekStart, days }) => (
              <tr key={weekStart.toISOString()}>
                <td className="text-[10px] font-pixel text-quest-ink/70 pr-1 align-middle whitespace-nowrap">
                  {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
                {days.map((d) => {
                  const isToday = d.iso === todayISO;
                  const isFuture = d.date.getTime() > Date.now();
                  return (
                    <td
                      key={d.iso}
                      title={`${d.iso} · ${d.subs.length} submission${d.subs.length === 1 ? "" : "s"}`}
                      className={[
                        "w-9 h-9 rounded text-center align-middle text-xs leading-9",
                        "border-2",
                        isToday ? "border-quest-accent font-bold ring-2 ring-quest-accent/40" : "border-quest-shadow",
                        isFuture && d.subs.length === 0 ? "opacity-40" : "",
                        cellTone(d.subs),
                      ].join(" ")}
                    >
                      {d.date.getDate()}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-quest-ink/70">
        <Legend swatch="bg-quest-mint" label="done" />
        <Legend swatch="bg-quest-gold/70" label="waiting" />
        <Legend swatch="bg-white" label="empty" />
        <span className="ml-auto">today is outlined in pink</span>
      </div>
    </section>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block w-3 h-3 rounded border-2 border-quest-shadow ${swatch}`} />
      {label}
    </span>
  );
}
