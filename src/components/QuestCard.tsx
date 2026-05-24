import { useState } from "react";
import { supabase } from "../lib/supabase";
import { STAMPS, type Profile, type Submission } from "../types";
import { ScreenshotImage } from "./ScreenshotImage";
import { demoUpdate, isDemo } from "../lib/demo";

const STATUS_STYLE: Record<Submission["status"], string> = {
  pending: "bg-quest-gold/40",
  approved: "bg-quest-mint/50",
  needs_redo: "bg-quest-accent/30",
};

const STATUS_LABEL: Record<Submission["status"], string> = {
  pending: "🟡 Awaiting stamp",
  approved: "✅ Approved",
  needs_redo: "🔁 Try again",
};

export function QuestCard({
  submission,
  viewer,
}: {
  submission: Submission;
  viewer: Profile;
}) {
  const [expanded, setExpanded] = useState(submission.status === "pending");
  const [stamp, setStamp] = useState<string>(submission.stamp ?? "🌟");
  const [comment, setComment] = useState(submission.checker_comment ?? "");
  const [busy, setBusy] = useState(false);

  const isChecker = viewer.role === "checker";
  const canReview = isChecker && submission.status === "pending";

  async function review(next: "approved" | "needs_redo") {
    setBusy(true);
    const patch = {
      status: next,
      stamp: next === "approved" ? stamp : null,
      checker_comment: comment.trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: viewer.id,
    };

    if (isDemo()) {
      demoUpdate(submission.id, patch);
      setBusy(false);
      return;
    }

    const { error } = await supabase
      .from("submissions")
      .update(patch)
      .eq("id", submission.id);
    setBusy(false);
    if (error) {
      alert(error.message);
    }
  }

  return (
    <article className={`pixel-card ${STATUS_STYLE[submission.status]}`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm text-quest-ink">{submission.lesson_title}</h3>
          <p className="text-xs text-quest-ink/70 mt-1">
            submitted {new Date(submission.submitted_at).toLocaleString()}
          </p>
        </div>
        <span className="chip bg-white">{STATUS_LABEL[submission.status]}</span>
      </header>

      {submission.status === "approved" && submission.stamp && (
        <div className="mt-2 text-3xl text-center" title="stamp">
          {submission.stamp}
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        className="text-xs underline mt-2 text-quest-ink/70"
      >
        {expanded ? "hide details" : "show details"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {submission.lesson_url && (
            <a
              href={submission.lesson_url}
              target="_blank"
              rel="noreferrer"
              className="block text-xs underline break-all"
            >
              {submission.lesson_url}
            </a>
          )}

          <ScreenshotImage path={submission.screenshot_path} alt={submission.lesson_title} />

          {submission.note && (
            <p className="text-sm bg-white/70 border-2 border-quest-shadow rounded p-2">
              📝 {submission.note}
            </p>
          )}

          {submission.checker_comment && (
            <p className="text-sm bg-quest-sky/40 border-2 border-quest-shadow rounded p-2">
              👀 {submission.checker_comment}
            </p>
          )}

          {canReview && (
            <div className="space-y-2 border-t-2 border-dashed border-quest-shadow pt-3">
              <div>
                <p className="text-xs font-pixel mb-1">Pick a stamp</p>
                <div className="flex flex-wrap gap-2">
                  {STAMPS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStamp(s)}
                      className={`text-2xl w-10 h-10 rounded-lg border-2 border-quest-shadow ${
                        stamp === s ? "bg-quest-gold shadow-pixel-sm" : "bg-white"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                className="pixel-input w-full"
                rows={2}
                placeholder="Nice work! / Try again because…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="pixel-btn flex-1 bg-quest-mint text-quest-shadow"
                  disabled={busy}
                  onClick={() => review("approved")}
                >
                  Approve & stamp
                </button>
                <button
                  type="button"
                  className="pixel-btn flex-1 bg-quest-accent text-white"
                  disabled={busy}
                  onClick={() => review("needs_redo")}
                >
                  Send back
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
