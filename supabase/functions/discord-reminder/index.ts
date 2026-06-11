// discord-reminder: pg_cron이 하루 1회 호출하는 미제출 리마인드 함수.
// 마지막 제출이 3일 이상 전이면 임파워링 메시지 5종 중 랜덤 1개를 발송.
// ?preview=1 을 붙이면 3일 조건을 무시하고 즉시 발송 (디자인 확인용).
// 배포: supabase functions deploy discord-reminder --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const REMIND_AFTER_DAYS = 3;
const SITE_URL = "https://leeleelee3264.github.io/ashleigh-korean-quest/";
const COLOR_PINK = 0xf472b6;

// {d} 자리에 경과 일수가 들어감. 임파워링 + 재치 톤.
const REMINDERS: { title: string; body: (d: string) => string }[] = [
  {
    title: "🌱 Your Korean adventure misses you!",
    body: (d) =>
      `It's been **${d}** since your last quest, Ashleigh. One small video today = future you saying *"감사합니다, past me!"* 💪`,
  },
  {
    title: "⚔️ A wild quest appeared!",
    body: (d) =>
      `**${d}** since your last clear — but you've beaten way harder bosses than a play button. Equip headphones, press play, collect XP! 🎮`,
  },
  {
    title: "🐱 The quest log is feeling lonely…",
    body: (d) =>
      `It's been quiet for **${d}**. Ten minutes of MasterTopik and the magic comes right back. Sungmin's approve stamp is fully charged and waiting ✨`,
  },
  {
    title: "🔥 Champions rest, then return.",
    body: (d) =>
      `**${d}** of rest — that's enough recharging! Today is a *perfect* comeback day. One video and you're back on the board. 화이팅! 🏆`,
  },
  {
    title: "🚀 Future fluent-Ashleigh says hi!",
    body: (d) =>
      `She was built on days exactly like today. It's been **${d}** — one video is all it takes to keep building her. You've got this! 🌟`,
  },
];

Deno.serve(async (req) => {
  const secret = Deno.env.get("QUEST_HOOK_SECRET");
  if (!secret || req.headers.get("x-quest-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  const webhook = Deno.env.get("DISCORD_WEBHOOK_URL");
  if (!webhook) return new Response("webhook not configured", { status: 500 });

  const preview = new URL(req.url).searchParams.get("preview") === "1";

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

  if (daysSince < REMIND_AFTER_DAYS && !preview) {
    return new Response(`ok: last submission ${daysSince.toFixed(1)}d ago`);
  }

  const days = Number.isFinite(daysSince) ? Math.floor(daysSince) : null;
  const dayLabel =
    days === null ? "a while" : days <= 1 ? "1 day" : `${days} days`;

  const pick = REMINDERS[Math.floor(Math.random() * REMINDERS.length)];

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          author: { name: "🔔 Quest Reminder" },
          title: pick.title,
          url: SITE_URL,
          description: pick.body(dayLabel),
          fields: [
            {
              name: "🎯 Today's quest",
              value: `[Open Korean Study Quest →](${SITE_URL})`,
            },
          ],
          color: COLOR_PINK,
          footer: { text: "Korean Study Quest • weekly goal: 2 videos" },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
  if (!res.ok) {
    return new Response(`discord error: ${res.status}`, { status: 502 });
  }

  return new Response(preview ? "preview sent" : "reminded");
});
