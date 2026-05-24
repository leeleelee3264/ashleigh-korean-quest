import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { isDemo } from "../lib/demo";

export function ScreenshotImage({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(
    path.startsWith("data:") || isDemo() ? path : null
  );

  useEffect(() => {
    if (path.startsWith("data:")) {
      setUrl(path);
      return;
    }
    if (isDemo()) {
      setUrl(path);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from("screenshots")
      .createSignedUrl(path, 60 * 30)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[signed url]", error);
          return;
        }
        setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) {
    return (
      <div className="w-full h-40 bg-quest-bg border-2 border-dashed border-quest-shadow rounded grid place-items-center text-xs text-quest-ink/60">
        loading screenshot…
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      className="w-full max-h-80 object-contain rounded border-2 border-quest-shadow bg-white"
    />
  );
}
