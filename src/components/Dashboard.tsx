import { useMemo, useState } from "react";
import type { Profile, Submission } from "../types";
import { WEEKLY_GOAL } from "../types";
import { calcStreak, endOfWeek, formatRange, startOfWeek, toISODate } from "../lib/week";
import { useSubmissions } from "../hooks/useSubmissions";
import { SubmitForm } from "./SubmitForm";
import { QuestCard } from "./QuestCard";
import { QuestCalendar } from "./QuestCalendar";

export function Dashboard({ viewer, signOut }: { viewer: Profile; signOut: () => void }) {
  const { submissions, loading } = useSubmissions();

  const weekStart = startOfWeek();
  const weekStartISO = toISODate(weekStart);
  const weekEnd = endOfWeek();

  const thisWeek = useMemo(
    () => submissions.filter((s) => s.week_start === weekStartISO),
    [submissions, weekStartISO]
  );
  const thisWeekApproved = thisWeek.filter((s) => s.status === "approved").length;
  const pendingForChecker = submissions.filter((s) => s.status === "pending");
  const allApprovedWeekStarts = useMemo(
    () => submissions.filter((s) => s.status === "approved").map((s) => s.week_start),
    [submissions]
  );
  const streak = calcStreak(allApprovedWeekStarts, WEEKLY_GOAL);

  const stampsCollected = submissions
    .filter((s) => s.status === "approved" && s.stamp)
    .map((s) => s.stamp!) as string[];

  const progressPct = Math.min(100, Math.round((thisWeekApproved / WEEKLY_GOAL) * 100));

  const weekGroups = useMemo(() => groupByWeek(submissions), [submissions]);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 pb-12">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl">Ashley's Korean Quest</h1>
          <p className="text-xs text-quest-ink/70 mt-1">
            playing as {viewer.avatar_emoji ?? "🎮"} {viewer.display_name} · {viewer.role}
          </p>
        </div>
        <button onClick={signOut} className="pixel-btn bg-white text-quest-ink text-xs">
          log out
        </button>
      </header>

      <section className="pixel-card bg-gradient-to-br from-white to-quest-bg">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base">⚔️ This week's quest</h2>
          <span className="chip bg-white">{formatRange(weekStart, weekEnd)}</span>
        </div>

        <div className="mt-4">
          <div className="flex items-end justify-between mb-1">
            <span className="font-pixel text-xs">
              {thisWeekApproved} / {WEEKLY_GOAL} videos approved
            </span>
            <span className="text-xs text-quest-ink/70">
              {thisWeek.length - thisWeekApproved > 0
                ? `${thisWeek.length - thisWeekApproved} awaiting review`
                : "all caught up"}
            </span>
          </div>
          <div className="h-5 bg-white border-2 border-quest-shadow rounded overflow-hidden">
            <div
              className="h-full bg-quest-mint transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          <Stat label="Streak" value={`${streak} 🔥`} />
          <Stat label="Stamps" value={`${stampsCollected.length} 🏅`} />
          <Stat label="Total quests" value={`${submissions.length} 📚`} />
        </div>

        {stampsCollected.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-pixel mb-1">Stamp collection</p>
            <div className="flex flex-wrap gap-1 text-2xl">
              {stampsCollected.slice(0, 24).map((s, i) => (
                <span key={i}>{s}</span>
              ))}
              {stampsCollected.length > 24 && (
                <span className="text-xs self-end text-quest-ink/60">
                  +{stampsCollected.length - 24}
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      <QuestCalendar submissions={submissions} />

      {viewer.role === "student" && <SubmitForm student={viewer} />}

      {viewer.role === "checker" && pendingForChecker.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm sm:text-base">
            🛎️ Pending stamps ({pendingForChecker.length})
          </h2>
          {pendingForChecker.map((s) => (
            <QuestCard key={s.id} submission={s} viewer={viewer} />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm sm:text-base">📜 Quest log</h2>
        {loading && <p className="text-sm text-quest-ink/60">loading…</p>}
        {!loading && submissions.length === 0 && (
          <p className="text-sm text-quest-ink/60 pixel-card">
            No quests yet.{" "}
            {viewer.role === "student"
              ? "Submit your first one above!"
              : "Waiting for Ashley to submit."}
          </p>
        )}
        {weekGroups.map((g) => (
          <WeekGroup
            key={g.weekStart}
            group={g}
            viewer={viewer}
            defaultOpen={g.weekStart === weekStartISO}
            hidePendingForChecker={viewer.role === "checker"}
          />
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border-2 border-quest-shadow rounded-lg p-3 shadow-pixel-sm">
      <p className="text-[10px] uppercase font-pixel text-quest-ink/60">{label}</p>
      <p className="text-lg font-bold">{value}</p>
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
  hidePendingForChecker,
}: {
  group: WeekGroupData;
  viewer: Profile;
  defaultOpen: boolean;
  hidePendingForChecker: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const visible = hidePendingForChecker
    ? group.submissions.filter((s) => s.status !== "pending")
    : group.submissions;

  if (visible.length === 0) return null;

  const approved = visible.filter((s) => s.status === "approved").length;
  const pending = visible.filter((s) => s.status === "pending").length;
  const redo = visible.filter((s) => s.status === "needs_redo").length;

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
            {approved}✅ {pending > 0 && `· ${pending}🟡 `}
            {redo > 0 && `· ${redo}🔁`}
          </p>
        </div>
        <span className="text-xs text-quest-ink/60">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="p-4 pt-0 space-y-3 border-t-2 border-quest-shadow">
          {visible.map((s) => (
            <QuestCard key={s.id} submission={s} viewer={viewer} />
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
