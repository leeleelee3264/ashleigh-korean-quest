// Role + local storage helpers.
//
// - The picked role (student/checker) lives in sessionStorage, used in BOTH
//   modes: demo (no Supabase) and the shared-account Supabase login (B1).
// - "demo mode" = no Supabase keys configured → submissions are kept in
//   localStorage so the app is fully usable offline. With keys configured the
//   hooks talk to Supabase instead.

import type { Profile, Role, Submission } from "../types";
import { ROLE_PROFILES } from "../types";
import { hasSupabaseConfig } from "./supabase";

const ROLE_KEY = "quest.role";
const SUBS_KEY = "demo.submissions.v1";
const EVT = "demo:submissions";

// True when there are no Supabase keys → use localStorage as the backend.
export function isDemo(): boolean {
  return !hasSupabaseConfig;
}

export function getRole(): Role | null {
  try {
    const v = sessionStorage.getItem(ROLE_KEY);
    return v === "student" || v === "checker" ? v : null;
  } catch {
    return null;
  }
}

export function setRole(role: Role) {
  sessionStorage.setItem(ROLE_KEY, role);
}

export function clearRole() {
  sessionStorage.removeItem(ROLE_KEY);
}

export function profileForRole(): Profile | null {
  const role = getRole();
  return role ? ROLE_PROFILES[role] : null;
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
