import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";
import { demoProfile, exitDemo, isDemo } from "../lib/demo";

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (isDemo()) {
      const p = demoProfile();
      setUserId(p?.id ?? null);
      setProfile(p);
      setLoading(false);
      return;
    }

    async function bootstrap(uid: string | null) {
      setUserId(uid);
      if (!uid) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (!cancelled) {
        if (error) console.error("[profile load]", error);
        setProfile(data as Profile | null);
        setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => bootstrap(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      bootstrap(session?.user.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    loading,
    userId,
    profile,
    signOut: async () => {
      if (isDemo()) {
        exitDemo();
        window.location.reload();
        return;
      }
      await supabase.auth.signOut();
    },
  };
}
