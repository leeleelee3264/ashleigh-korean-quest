export type Role = "student" | "checker";

export type Profile = {
  id: string;
  display_name: string;
  role: Role;
  avatar_emoji: string | null;
};

export type SubmissionStatus = "pending" | "approved" | "needs_redo";

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

export const STAMPS = ["🔥", "💯", "🌟", "👍", "🏆", "💖"] as const;
export type Stamp = (typeof STAMPS)[number];

export const WEEKLY_GOAL = 2;
export const MASTERTOPIK_URL = "https://www.mastertopik.com/courses/49";
