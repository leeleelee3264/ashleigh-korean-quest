// discord-reminder: pg_cron이 하루 1회 호출하는 미제출 리마인드 함수.
// 마지막 제출이 3일 이상 전이면 디스코드로 리마인드, 아니면 조용히 종료.
// 배포: supabase functions deploy discord-reminder --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const REMIND_AFTER_DAYS = 3;

Deno.serve(async (req) => {
  const secret = Deno.env.get("QUEST_HOOK_SECRET");
  if (!secret || req.headers.get("x-quest-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  const webhook = Deno.env.get("DISCORD_WEBHOOK_URL");
  if (!webhook) return new Response("webhook not configured", { status: 500 });

  // service role 키는 Edge Function 런타임에 자동 주입됨 (RLS 우회 조회용)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase
    .from("submissions")
    .select("submitted_at")
    .order("submitted_at", { ascending: false })
    .limit(1);

  if (error) return new Response(`db error: ${error.message}`, { status: 500 });

  const last = data?.[0]?.submitted_at;
  const daysSince = last
    ? (Date.now() - new Date(last).getTime()) / 86_400_000
    : Infinity;

  if (daysSince < REMIND_AFTER_DAYS) {
    return new Response(`ok: last submission ${daysSince.toFixed(1)}d ago`);
  }

  const days = Number.isFinite(daysSince) ? Math.floor(daysSince) : null;
  const content = [
    "🔔 **Quest reminder!**",
    days === null
      ? "🐱 No quests submitted yet… time to start one?"
      : `🐱 It's been **${days} days** since the last quest.`,
    "📚 https://leeleelee3264.github.io/ashleigh-korean-quest/",
  ].join("\n");

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    return new Response(`discord error: ${res.status}`, { status: 502 });
  }

  return new Response("reminded");
});
