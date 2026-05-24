import { useState } from "react";
import { supabase, hasSupabaseConfig } from "../lib/supabase";
import { enterDemo } from "../lib/demo";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
  }

  function startDemo(role: "student" | "checker") {
    enterDemo(role);
    window.location.reload();
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="pixel-card w-full max-w-md text-center">
        <div className="text-5xl mb-2">🗝️</div>
        <h1 className="text-xl text-quest-ink mb-1">Ashley's Korean Quest</h1>
        <p className="text-sm text-quest-ink/70 mb-6">Sign in to continue your quest.</p>

        <div className="mb-6 p-4 border-4 border-quest-shadow rounded-lg bg-quest-gold/30 text-left">
          <p className="font-pixel text-[10px] mb-2 text-quest-ink">🧪 DEMO MODE</p>
          <p className="text-xs mb-3 text-quest-ink/80">
            No Supabase yet? Try the app with fake data — open one tab as Ashley and another
            as Sungmin to see both sides. Data stays in your browser.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => startDemo("student")}
              className="pixel-btn bg-quest-mint text-quest-shadow"
            >
              🦊 Ashley
            </button>
            <button
              type="button"
              onClick={() => startDemo("checker")}
              className="pixel-btn bg-quest-sky text-quest-shadow"
            >
              🐻 Sungmin
            </button>
          </div>
        </div>

        {!hasSupabaseConfig && (
          <p className="text-[11px] text-quest-ink/60 mb-4">
            (Real login is disabled until <code>.env</code> is set with Supabase keys.)
          </p>
        )}

        <details className="text-left">
          <summary className="cursor-pointer text-xs font-pixel text-quest-ink/70 mb-3">
            real sign-in
          </summary>
          <form onSubmit={onSubmit} className="space-y-3 mt-3">
            <label className="block">
              <span className="text-xs font-pixel">Email</span>
              <input
                className="pixel-input w-full mt-1"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-pixel">Password</span>
              <input
                className="pixel-input w-full mt-1"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {err && <p className="text-sm text-red-600 font-semibold">{err}</p>}
            <button
              type="submit"
              disabled={busy || !hasSupabaseConfig}
              className="pixel-btn w-full bg-quest-accent text-white"
            >
              {busy ? "Entering…" : "Enter the quest"}
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}
