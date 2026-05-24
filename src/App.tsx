import { useAuth } from "./hooks/useAuth";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";

export default function App() {
  const { loading, userId, profile, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-full grid place-items-center">
        <p className="font-pixel text-xs">loading the quest…</p>
      </div>
    );
  }

  if (!userId) return <Login />;

  if (!profile) {
    return (
      <div className="min-h-full grid place-items-center p-6">
        <div className="pixel-card max-w-md text-center">
          <h1 className="text-base mb-2">Profile missing</h1>
          <p className="text-sm text-quest-ink/70">
            This Supabase user has no <code>profiles</code> row yet. Insert one with the matching
            UUID and a role of <code>student</code> or <code>checker</code> (see
            <code> supabase/schema.sql</code>), then refresh.
          </p>
          <button onClick={signOut} className="pixel-btn mt-4 bg-white">
            log out
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard viewer={profile} signOut={signOut} />;
}
