import { useState } from "react";
import { supabase, hasSupabaseConfig } from "../lib/supabase";
import { setRole, clearRole } from "../lib/demo";

// B1 model: ONE shared Supabase account. Both people log in with the same
// email + password; the role is chosen by which button you tap.
// The email is not secret (it ships in the bundle) — security rests on the
// password (verified by Supabase) + RLS.
// ⚠️ Replace with the email of the single account you create in Supabase.
const SHARED_EMAIL = "quest@quest.app";

// Only used for the offline demo gate (when Supabase isn't configured).
const GATE_PASSWORD = import.meta.env.VITE_GATE_PASSWORD as string | undefined;

export function Login() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function enter(role: "student" | "checker") {
    setErr(null);
    const pw = password.trim();
    if (!pw) {
      setErr("Enter the password.");
      return;
    }

    // Remember which side we're playing as (used in both modes).
    setRole(role);

    // Real Supabase auth: one shared account, password verified server-side.
    if (hasSupabaseConfig) {
      setBusy(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: SHARED_EMAIL,
        password: pw,
      });
      setBusy(false);
      if (error) {
        clearRole();
        setErr("Wrong password 🙈");
        return;
      }
      window.location.reload();
      return;
    }

    // Offline demo fallback: gate by VITE_GATE_PASSWORD.
    if (!GATE_PASSWORD) {
      clearRole();
      setErr("Password is not configured. Set VITE_GATE_PASSWORD in .env");
      return;
    }
    if (pw !== GATE_PASSWORD) {
      clearRole();
      setErr("Wrong password 🙈");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="pixel-card w-full max-w-md text-center">
        <div className="text-5xl mb-2">🗝️</div>
        <h1 className="text-xl text-quest-ink mb-1">Ashleigh's Korean Study Quest</h1>
        <p className="text-sm text-quest-ink/70 mb-6">
          Enter the password, then pick who you are.
        </p>

        <label className="block text-left mb-1">
          <span className="text-xs font-pixel">Password</span>
          <input
            className="pixel-input w-full mt-1 text-center tracking-widest"
            type="password"
            inputMode="numeric"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErr(null);
            }}
            placeholder="••••"
            disabled={busy}
          />
        </label>
        <p className="text-[11px] text-quest-ink/60 mb-4">Hint: our birth year 🎂</p>

        {err && <p className="text-sm text-red-600 font-semibold mb-3">{err}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => enter("student")}
            disabled={busy}
            className="pixel-btn bg-quest-mint text-quest-shadow"
          >
            🐱 Ashleigh
          </button>
          <button
            type="button"
            onClick={() => enter("checker")}
            disabled={busy}
            className="pixel-btn bg-quest-sky text-quest-shadow"
          >
            🐶 Sungmin
          </button>
        </div>

        {!hasSupabaseConfig && (
          <p className="text-[10px] text-quest-ink/50 mt-4">
            demo mode — data stays in this browser
          </p>
        )}
      </div>
    </div>
  );
}
