import { useState } from "react";
import { supabase, hasSupabaseConfig } from "../lib/supabase";
import { enterDemo } from "../lib/demo";

// Account emails are baked in so users only type a password.
// These are NOT secret (they ship in the bundle) — security rests on the
// password (verified by Supabase) + RLS, not on hiding the email.
// ⚠️ Replace with the two emails you register in Supabase → Authentication → Users.
const ACCOUNTS = {
  student: { email: "ashleigh@quest.app", emoji: "🐱", label: "Ashleigh" },
  checker: { email: "sungmin@quest.app", emoji: "🐶", label: "Sungmin" },
} as const;

// Used only for the offline demo gate (when Supabase isn't configured).
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

    // Real Supabase auth (email baked in, user types only the password).
    if (hasSupabaseConfig) {
      setBusy(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: ACCOUNTS[role].email,
        password: pw,
      });
      setBusy(false);
      if (error) setErr("Wrong password 🙈");
      // on success, useAuth's onAuthStateChange takes over
      return;
    }

    // Offline demo fallback: gate by VITE_GATE_PASSWORD.
    if (!GATE_PASSWORD) {
      setErr("Password is not configured. Set VITE_GATE_PASSWORD in .env");
      return;
    }
    if (pw !== GATE_PASSWORD) {
      setErr("Wrong password 🙈");
      return;
    }
    enterDemo(role);
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
