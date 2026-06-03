import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";
import { clearRole, getRole, isDemo, profileForRole } from "../lib/demo";

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    // Demo mode: the picked role alone means "logged in" (localStorage backend).
    if (isDemo()) {
      const p = profileForRole();
      setUserId(p?.id ?? null);
      setProfile(p);
      setLoading(false);
      return;
    }

    // Shared-account Supabase (B1): logged in = active session AND a chosen role.
    function apply(hasSession: boolean) {
      const p = hasSession ? profileForRole() : null;
      setUserId(p?.id ?? null);
      setProfile(p);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => apply(Boolean(data.session && getRole())));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      apply(Boolean(session && getRole()));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return {
    loading,
    userId,
    profile,
    signOut: async () => {
      clearRole();
      if (!isDemo()) await supabase.auth.signOut();
      window.location.reload();
    },
  };
}
