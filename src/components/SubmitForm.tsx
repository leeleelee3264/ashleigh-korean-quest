import { useState } from "react";
import { supabase } from "../lib/supabase";
import { MASTERTOPIK_URL, type Profile } from "../types";
import { startOfWeek, toISODate } from "../lib/week";
import { compressImageToDataUrl, demoInsert, isDemo } from "../lib/demo";

export function SubmitForm({ student }: { student: Profile }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!file) {
      setErr("Please attach a screenshot.");
      return;
    }
    setBusy(true);
    const weekStart = toISODate(startOfWeek());

    try {
      if (isDemo()) {
        const dataUrl = await compressImageToDataUrl(file);
        demoInsert({
          id: crypto.randomUUID(),
          student_id: student.id,
          week_start: weekStart,
          lesson_title: title.trim(),
          lesson_url: null,
          screenshot_path: dataUrl,
          note: note.trim() || null,
          submitted_at: new Date().toISOString(),
          status: "pending",
          stamp: null,
          checker_comment: null,
          reviewed_at: null,
          reviewed_by: null,
        });
        finish();
        return;
      }

      const ext = file.name.split(".").pop() ?? "png";
      const path = `${student.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("screenshots").upload(path, file, {
        contentType: file.type || "image/png",
        upsert: false,
      });
      if (up.error) throw up.error;

      const ins = await supabase.from("submissions").insert({
        student_id: student.id,
        week_start: weekStart,
        lesson_title: title.trim(),
        lesson_url: null,
        screenshot_path: path,
        note: note.trim() || null,
      });
      if (ins.error) throw ins.error;
      finish();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.name === "QuotaExceededError"
            ? "Browser storage is full. Clear old demo quests (log out + clear site data) or try a smaller screenshot."
            : e.message
          : "Submission failed.";
      setErr(msg);
      setBusy(false);
    }
  }

  function finish() {
    setBusy(false);
    setTitle("");
    setNote("");
    setFile(null);
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  }

  return (
    <form onSubmit={onSubmit} className="pixel-card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base text-quest-ink">📜 Submit a quest</h2>
        <a
          href={MASTERTOPIK_URL}
          target="_blank"
          rel="noreferrer"
          className="text-xs underline text-quest-ink/70 hover:text-quest-accent"
        >
          open MasterTopik ↗
        </a>
      </div>

      <label className="block">
        <span className="text-xs font-pixel">Lesson title</span>
        <input
          className="pixel-input w-full mt-1"
          placeholder="Lesson 12 – Vocabulary"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>

      <label className="block">
        <span className="text-xs font-pixel">Screenshot proof</span>
        <input
          className="pixel-input w-full mt-1 file:mr-3 file:rounded file:border-0 file:bg-quest-mint file:px-2 file:py-1"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
        {file && (
          <p className="text-xs mt-1 text-quest-ink/70">📎 {file.name}</p>
        )}
      </label>

      <label className="block">
        <span className="text-xs font-pixel">What I learnt</span>
        <textarea
          className="pixel-input w-full mt-1"
          rows={2}
          placeholder="새로 배운 단어, 문법, 표현…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {err && <p className="text-sm text-red-600 font-semibold">{err}</p>}
      {done && (
        <p className="text-sm text-green-700 font-semibold">
          ✨ Submitted! Sungmin will stamp it soon.
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="pixel-btn w-full bg-quest-gold text-quest-shadow"
      >
        {busy ? "Submitting…" : "Submit quest 🪄"}
      </button>
    </form>
  );
}
