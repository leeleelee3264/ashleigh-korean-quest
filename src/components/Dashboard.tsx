import { useMemo, useState } from "react";
import type { Profile, Submission } from "../types";
import { WEEKLY_GOAL } from "../types";
import { endOfWeek, formatRange, monthLabel, sameMonth, startOfWeek, toISODate } from "../lib/week";
import { useSubmissions } from "../hooks/useSubmissions";
import { SubmitForm } from "./SubmitForm";
import { QuestCard } from "./QuestCard";
import { QuestCalendar } from "./QuestCalendar";

export function Dashboard({ viewer, signOut }: { viewer: Profile; signOut: () => void }) {
  const { submissions, loading, reload } = useSubmissions();
  const [showArchive, setShowArchive] = useState(false);

  const weekStart = startOfWeek();
  const weekStartISO = toISODate(weekStart);
  const weekEnd = endOfWeek();

  const thisWeek = submissions.filter((s) => s.week_start === weekStartISO);
  const thisWeekApproved = thisWeek.filter((s) => s.status === "approved").length;
  const thisWeekWaiting = thisWeek.length - thisWeekApproved;
  const pendingForChecker = submissions.filter((s) => s.status === "pending");
  const progressPct = Math.min(100, Math.round((thisWeekApproved / WEEKLY_GOAL) * 100));

  const weekGroups = useMemo(() => groupByWeek(submissions), [submissions]);
  const thisMonthGroups = weekGroups.filter((g) => sameMonth(g.weekStart));
  const archiveGroups = weekGroups.filter((g) => !sameMonth(g.weekStart));

  if (showArchive) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4 pb-12">
        <button onClick={() => setShowArchive(false)} className="pixel-btn bg-white text-xs">
          ← back
        </button>
        <h1 className="text-base sm:text-lg">📦 Past quests</h1>
        {archiveGroups.length === 0 && (
          <p className="text-sm text-quest-ink/60 pixel-card">No older quests yet.</p>
        )}
        {archiveGroups.map((g) => (
          <WeekGroup key={g.weekStart} group={g} viewer={viewer} defaultOpen={false} onChanged={reload} />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 pb-12">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl">Ashleigh's Korean Study Quest</h1>
          <p className="text-xs text-quest-ink/70 mt-1">
            {viewer.avatar_emoji ?? "🎮"} {viewer.display_name}
          </p>
        </div>
        <button onClick={signOut} className="pixel-btn bg-white text-quest-ink text-xs">
          log out
        </button>
      </header>

      <section className="pixel-card bg-gradient-to-br from-white to-quest-bg">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base">⚔️ This week</h2>
          <span className="chip bg-white">{formatRange(weekStart, weekEnd)}</span>
        </div>

        <div className="mt-4">
          <div className="flex items-end justify-between mb-1">
            <span className="font-pixel text-xs">
              {thisWeekApproved > WEEKLY_GOAL
                ? `${thisWeekApproved} done · goal ${WEEKLY_GOAL} 🎉`
                : `${thisWeekApproved} / ${WEEKLY_GOAL} done`}
            </span>
            <span className="text-xs text-quest-ink/70">
              {thisWeekWaiting > 0 ? `${thisWeekWaiting} waiting for approval` : "all caught up"}
            </span>
          </div>
          <div className="h-5 bg-white border-2 border-quest-shadow rounded overflow-hidden">
            <div
              className="h-full bg-quest-mint transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </section>

      <QuestCalendar submissions={submissions} />

      {viewer.role === "student" && <SubmitForm student={viewer} onSubmitted={reload} />}

      {viewer.role === "checker" && pendingForChecker.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm sm:text-base">
            🛎️ To approve ({pendingForChecker.length})
          </h2>
          {pendingForChecker.map((s) => (
            <QuestCard key={s.id} submission={s} viewer={viewer} onChanged={reload} />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm sm:text-base">📜 {monthLabel()}</h2>
        {loading && <p className="text-sm text-quest-ink/60">loading…</p>}
        {!loading && thisMonthGroups.length === 0 && (
          <p className="text-sm text-quest-ink/60 pixel-card">
            No quests this month.{" "}
            {viewer.role === "student" ? "Submit your first one above!" : "Waiting for Ashleigh."}
          </p>
        )}
        {thisMonthGroups.map((g) => (
          <WeekGroup
            key={g.weekStart}
            group={g}
            viewer={viewer}
            defaultOpen={g.weekStart === weekStartISO}
            onChanged={reload}
          />
        ))}

        <button
          onClick={() => setShowArchive(true)}
          className="pixel-btn w-full bg-white text-xs"
        >
          📦 See past quests →
        </button>
      </section>
    </div>
  );
}

type WeekGroupData = {
  weekStart: string; // YYYY-MM-DD
  submissions: Submission[];
};

function groupByWeek(subs: Submission[]): WeekGroupData[] {
  const map = new Map<string, Submission[]>();
  for (const s of subs) {
    if (!map.has(s.week_start)) map.set(s.week_start, []);
    map.get(s.week_start)!.push(s);
  }
  return Array.from(map.entries())
    .map(([weekStart, submissions]) => ({ weekStart, submissions }))
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
}

function WeekGroup({
  group,
  viewer,
  defaultOpen,
  onChanged,
}: {
  group: WeekGroupData;
  viewer: Profile;
  defaultOpen: boolean;
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const approved = group.submissions.filter((s) => s.status === "approved").length;
  const waiting = group.submissions.filter((s) => s.status === "pending").length;

  const start = parseISODate(group.weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return (
    <div className="pixel-card !p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left p-4 flex items-center justify-between gap-2 hover:bg-quest-bg"
      >
        <div>
          <p className="font-pixel text-xs">{formatRange(start, end)}</p>
          <p className="text-[11px] text-quest-ink/60 mt-1">
            {approved}✅ {waiting > 0 && `· ${waiting}⏳`}
          </p>
        </div>
        <span className="text-xs text-quest-ink/60">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="p-4 pt-0 space-y-3 border-t-2 border-quest-shadow">
          {group.submissions.map((s) => (
            <QuestCard key={s.id} submission={s} viewer={viewer} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
