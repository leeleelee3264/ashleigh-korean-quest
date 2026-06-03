import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { Profile, Submission } from "../types";
import { ScreenshotImage } from "./ScreenshotImage";
import { demoUpdate, isDemo } from "../lib/demo";

const STATUS_STYLE: Record<Submission["status"], string> = {
  pending: "bg-quest-gold/40",
  approved: "bg-quest-mint/50",
};

const STATUS_LABEL: Record<Submission["status"], string> = {
  pending: "⏳ Waiting for approval",
  approved: "✅ Approved",
};

export function QuestCard({
  submission,
  viewer,
}: {
  submission: Submission;
  viewer: Profile;
}) {
  const [expanded, setExpanded] = useState(submission.status === "pending");
  const [comment, setComment] = useState(submission.checker_comment ?? "");
  const [busy, setBusy] = useState(false);

  const isChecker = viewer.role === "checker";
  const canReview = isChecker && submission.status === "pending";

  async function approve() {
    setBusy(true);
    const patch = {
      status: "approved" as const,
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
        <div className="min-w-0">
          <h3 className="text-sm text-quest-ink">{submission.lesson_title}</h3>
          <p className="text-xs text-quest-ink/70 mt-1">
            submitted {new Date(submission.submitted_at).toLocaleString()}
          </p>
        </div>
        <span className="chip bg-white shrink-0">{STATUS_LABEL[submission.status]}</span>
      </header>

      {submission.note && (
        <p className="text-sm text-quest-ink/80 mt-2 truncate" title={submission.note}>
          📝 {submission.note}
        </p>
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
          <ScreenshotImage path={submission.screenshot_path} alt={submission.lesson_title} />

          {submission.note && (
            <p className="text-sm bg-white/70 border-2 border-quest-shadow rounded p-2">
              📝 What I learnt: {submission.note}
            </p>
          )}

          {submission.checker_comment && (
            <p className="text-sm bg-quest-sky/40 border-2 border-quest-shadow rounded p-2">
              ✅ {submission.checker_comment}
            </p>
          )}

          {canReview && (
            <div className="space-y-2 border-t-2 border-dashed border-quest-shadow pt-3">
              <textarea
                className="pixel-input w-full"
                rows={2}
                placeholder="Nice work! 잘했어 :) (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button
                type="button"
                className="pixel-btn w-full bg-quest-mint text-quest-shadow"
                disabled={busy}
                onClick={approve}
              >
                Approve ✅
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
