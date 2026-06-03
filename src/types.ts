export type Role = "student" | "checker";

export type Profile = {
  id: string;
  display_name: string;
  role: Role;
  avatar_emoji: string | null;
};

export type SubmissionStatus = "pending" | "approved";

export type Submission = {
  id: string;
  student_id: string;
  week_start: string; // ISO date YYYY-MM-DD
  lesson_title: string;
  lesson_url: string | null;
  screenshot_path: string;
  note: string | null;
  submitted_at: string;
  status: SubmissionStatus;
  stamp: string | null;
  checker_comment: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export const WEEKLY_GOAL = 2;
export const MASTERTOPIK_URL = "https://www.mastertopik.com/courses/49";

// The two roles share one Supabase account (B1 model); the role is chosen by
// which button you tap at login and kept in sessionStorage. These profiles are
// synthesized from that choice — there is no per-person account or profiles row.
export const ROLE_PROFILES: Record<Role, Profile> = {
  student: { id: "ashleigh", display_name: "Ashleigh", role: "student", avatar_emoji: "🐱" },
  checker: { id: "sungmin", display_name: "Sungmin", role: "checker", avatar_emoji: "🐶" },
};
