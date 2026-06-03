// Demo / "master" mode: bypass Supabase entirely.
// Role is per-tab (sessionStorage), submissions are shared (localStorage).
// So you can open one tab as Ashleigh, another as Sungmin, and watch them sync.

import type { Profile, Submission } from "../types";

const ROLE_KEY = "demo.role";
const SUBS_KEY = "demo.submissions.v1";
const EVT = "demo:submissions";

export function getDemoRole(): "student" | "checker" | null {
  try {
    const v = sessionStorage.getItem(ROLE_KEY);
    return v === "student" || v === "checker" ? v : null;
  } catch {
    return null;
  }
}

export function isDemo(): boolean {
  return getDemoRole() !== null;
}

export function enterDemo(role: "student" | "checker") {
  sessionStorage.setItem(ROLE_KEY, role);
}

export function exitDemo() {
  sessionStorage.removeItem(ROLE_KEY);
}

export function demoProfile(): Profile | null {
  const role = getDemoRole();
  if (role === "student") {
    return {
      id: "demo-ashley",
      display_name: "Ashleigh",
      role: "student",
      avatar_emoji: "🐱",
    };
  }
  if (role === "checker") {
    return {
      id: "demo-sungmin",
      display_name: "Sungmin",
      role: "checker",
      avatar_emoji: "🐶",
    };
  }
  return null;
}

export function demoListSubmissions(): Submission[] {
  try {
    const raw = localStorage.getItem(SUBS_KEY);
    return raw ? (JSON.parse(raw) as Submission[]) : [];
  } catch {
    return [];
  }
}

function persist(list: Submission[]) {
  localStorage.setItem(SUBS_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}

export function demoInsert(s: Submission) {
  const list = demoListSubmissions();
  list.unshift(s);
  persist(list);
}

export function demoUpdate(id: string, patch: Partial<Submission>) {
  const list = demoListSubmissions().map((s) => (s.id === id ? { ...s, ...patch } : s));
  persist(list);
}

export function subscribeDemo(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Shrink + re-encode as JPEG so screenshots fit in localStorage (~5 MB total quota).
// Target ≲ 250 KB per submission so you can keep dozens before hitting the cap.
export async function compressImageToDataUrl(
  file: File,
  maxDim = 1024,
  quality = 0.7
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("could not decode image"));
      el.src = objectUrl;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d unavailable");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
