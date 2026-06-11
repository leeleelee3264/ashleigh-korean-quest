// discord-notify: DB trigger(pg_net)가 호출하는 이벤트 알림 함수.
// 제출(INSERT) / 승인(UPDATE pending→approved) 시 디스코드 웹훅으로 메시지 발송.
// 배포: supabase functions deploy discord-notify --no-verify-jwt
// (대신 x-quest-secret 헤더로 자체 인증)

Deno.serve(async (req) => {
  const secret = Deno.env.get("QUEST_HOOK_SECRET");
  if (!secret || req.headers.get("x-quest-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  const webhook = Deno.env.get("DISCORD_WEBHOOK_URL");
  if (!webhook) return new Response("webhook not configured", { status: 500 });

  const { type, record, old_record } = await req.json();

  let content: string | null = null;

  if (type === "INSERT") {
    content = [
      "🐱 **Ashleigh submitted a quest!**",
      `📺 ${record.lesson_title}`,
      record.note ? `💬 ${record.note}` : null,
      "⏳ Waiting for approval…",
    ]
      .filter(Boolean)
      .join("\n");
  } else if (
    type === "UPDATE" &&
    old_record?.status === "pending" &&
    record?.status === "approved"
  ) {
    content = [
      "🐶 **Approved!** ✅",
      `📺 ${record.lesson_title}`,
      record.checker_comment ? `💬 ${record.checker_comment}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (content) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      return new Response(`discord error: ${res.status}`, { status: 502 });
    }
  }

  return new Response("ok");
});
