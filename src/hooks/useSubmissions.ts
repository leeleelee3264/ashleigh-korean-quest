import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Submission } from "../types";
import { demoListSubmissions, isDemo, subscribeDemo } from "../lib/demo";

export function useSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (isDemo()) {
      setSubmissions(demoListSubmissions());
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) {
      console.error("[submissions load]", error);
      setSubmissions([]);
    } else {
      setSubmissions((data ?? []) as Submission[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    if (isDemo()) {
      return subscribeDemo(load);
    }

    const channel = supabase
      .channel("submissions-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { submissions, loading, reload: load };
}
