// discord-notify: DB trigger(pg_net)가 호출하는 이벤트 알림 함수.
// 제출(INSERT) / 승인(UPDATE pending→approved) 시 디스코드 웹훅으로 embed 발송.
// 배포: supabase functions deploy discord-notify --no-verify-jwt
// (대신 x-quest-secret 헤더로 자체 인증)

const COLOR_GOLD = 0xfacc15; // waiting
const COLOR_MINT = 0x34d399; // approved
const SITE_URL = "https://leeleelee3264.github.io/ashleigh-korean-quest/";

// <t:unix:D> — 보는 사람의 시간대로 렌더링되는 디스코드 날짜 마크업
function discordDate(iso: string, style = "D"): string {
  return `<t:${Math.floor(Date.parse(iso) / 1000)}:${style}>`;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("QUEST_HOOK_SECRET");
  if (!secret || req.headers.get("x-quest-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  const webhook = Deno.env.get("DISCORD_WEBHOOK_URL");
  if (!webhook) return new Response("webhook not configured", { status: 500 });

  const { type, record, old_record } = await req.json();

  let payload: Record<string, unknown> | null = null;

  if (type === "INSERT") {
    const submittedAt = record.submitted_at ?? new Date().toISOString();
    payload = {
      content: "🐱 **New quest submitted!**",
      embeds: [
        {
          author: { name: "🐱 Ashleigh" },
          title: `📺 ${record.lesson_title}`,
          url: SITE_URL,
          description: record.note
            ? `**📝 What I learnt**\n${record.note}`
            : undefined,
          fields: [
            {
              name: "Status",
              value: "⏳ Waiting for approval",
              inline: true,
            },
            {
              name: "Submitted",
              value: discordDate(submittedAt),
              inline: true,
            },
          ],
          color: COLOR_GOLD,
          footer: { text: "Korean Study Quest" },
          timestamp: submittedAt,
        },
      ],
    };
  } else if (
    type === "UPDATE" &&
    old_record?.status === "pending" &&
    record?.status === "approved"
  ) {
    const reviewedAt = record.reviewed_at ?? new Date().toISOString();
    payload = {
      content: "🐶 **Quest approved!** 도장 쾅! 🎉",
      embeds: [
        {
          author: { name: "🐶 Sungmin" },
          title: `✅ ${record.lesson_title}`,
          url: SITE_URL,
          description: record.checker_comment
            ? `**💬 Sungmin's note**\n${record.checker_comment}`
            : undefined,
          fields: [
            {
              name: "Quest from",
              value: record.submitted_at
                ? discordDate(record.submitted_at)
                : "—",
              inline: true,
            },
            {
              name: "Approved",
              value: discordDate(reviewedAt),
              inline: true,
            },
          ],
          color: COLOR_MINT,
          footer: { text: "Korean Study Quest" },
          timestamp: reviewedAt,
        },
      ],
    };
  }

  if (payload) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return new Response(`discord error: ${res.status}`, { status: 502 });
    }
  }

  return new Response("ok");
});
