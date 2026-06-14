// discord-review: pg_cron이 매일 1회(KST 08:00) 호출하는 복습 카드 함수.
// "어제(KST) 제출한 노트" 중 최신 1건을 Gemini에 넣어 영어 설명 + 한국어 예문
// 복습 카드를 생성해 디스코드로 발송한다. 어제 제출이 없으면 조용히 패스.
// ?preview=1 을 붙이면 어제 조건을 무시하고 "노트 있는 최신 제출"로 즉시 발송.
// 배포: supabase functions deploy discord-review --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_URL = "https://leeleelee3264.github.io/ashleigh-korean-quest/";
const COLOR_BLUE = 0x60a5fa;
const KST = 9 * 60 * 60 * 1000;
const GEMINI_MODEL = "gemini-2.5-flash";

// 학습자(미국인) 기준: 설명·라벨·지시문은 영어, 한국어는 예문/문법형에만 + 영어 번역.
const SYSTEM_PROMPT =
  "You generate Korean-language study review cards for an American learner whose " +
  "native language is English. ALL explanations, labels, and instructions must be " +
  "in English. Korean appears ONLY in example sentences and the target grammar form, " +
  "and every Korean sentence must include a natural English gloss. Be warm and concise. " +
  "Strict rules: " +
  "(1) Each item in 'uses' MUST contain a COMPLETE, natural Korean example sentence " +
  "that actually uses the target grammar — never the bare grammar form alone. " +
  "(2) 'quiz.ko_with_blank' is a Korean sentence with the target spot written as ____ ; " +
  "'quiz.answer' is ONLY the single word/phrase that fills that blank (the conjugated " +
  "target form), NOT the whole sentence. " +
  "(3) Generate FRESH examples — do not copy the sentences in the note. " +
  "Return ONLY valid JSON with this shape: " +
  '{"title": string, "recap": string, "uses": [{"label": string, "ko": string, ' +
  '"en": string}], "examples": [{"ko": string, "en": string}], "quiz": ' +
  '{"prompt_en": string, "ko_with_blank": string, "answer": string, "answer_en": string}}';

interface Card {
  title: string;
  recap: string;
  uses: { label: string; ko: string; en: string }[];
  examples: { ko: string; en: string }[];
  quiz: {
    prompt_en: string;
    ko_with_blank: string;
    answer: string;
    answer_en: string;
  };
}

async function generateCard(
  apiKey: string,
  lessonTitle: string,
  note: string,
): Promise<Card> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{
          parts: [{
            text: `Lesson title: ${lessonTitle}\n\nMy note from yesterday:\n${note}`,
          }],
        }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`gemini ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("gemini returned no text");
  return JSON.parse(text) as Card;
}

function buildDescription(card: Card): string {
  const lines: string[] = [card.recap, ""];
  for (const u of card.uses) {
    lines.push(`**🎯 ${u.label}**`, `${u.ko} — *${u.en}*`, "");
  }
  if (card.examples.length) {
    lines.push("**✏️ Fresh examples**");
    for (const e of card.examples) lines.push(`• ${e.ko} — *${e.en}*`);
    lines.push("");
  }
  lines.push(
    `**🧩 Mini quiz** — *${card.quiz.prompt_en}*`,
    `${card.quiz.ko_with_blank} → ||\`${card.quiz.answer}\`||`,
  );
  return lines.join("\n");
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("QUEST_HOOK_SECRET");
  if (!secret || req.headers.get("x-quest-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  const webhook = Deno.env.get("DISCORD_WEBHOOK_URL");
  if (!webhook) return new Response("webhook not configured", { status: 500 });
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return new Response("gemini key not configured", { status: 500 });

  const preview = new URL(req.url).searchParams.get("preview") === "1";

  // service role 키는 Edge Function 런타임에 자동 주입됨 (RLS 우회 조회용)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 어제(KST) 캘린더 구간을 UTC 타임스탬프로 환산
  const nowKst = new Date(Date.now() + KST);
  const todayKstStartUtc = Date.UTC(
    nowKst.getUTCFullYear(),
    nowKst.getUTCMonth(),
    nowKst.getUTCDate(),
  ) - KST;
  const yStart = new Date(todayKstStartUtc - 24 * 60 * 60 * 1000).toISOString();
  const yEnd = new Date(todayKstStartUtc).toISOString();

  let query = supabase
    .from("submissions")
    .select("lesson_title, note, submitted_at")
    .not("note", "is", null)
    .neq("note", "")
    .order("submitted_at", { ascending: false })
    .limit(1);

  // 평시: 어제 제출분만. preview: 조건 무시하고 노트 있는 최신 제출.
  if (!preview) query = query.gte("submitted_at", yStart).lt("submitted_at", yEnd);

  const { data, error } = await query;
  if (error) return new Response(`db error: ${error.message}`, { status: 500 });

  const row = data?.[0];
  if (!row) return new Response("ok: nothing to review");

  let card: Card;
  try {
    card = await generateCard(apiKey, row.lesson_title, row.note);
  } catch (e) {
    return new Response(`gemini error: ${e}`, { status: 502 });
  }

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        author: { name: "🔁 Daily Review" },
        title: card.title,
        url: SITE_URL,
        description: buildDescription(card),
        color: COLOR_BLUE,
        footer: { text: "Korean Study Quest • Review is where it sticks" },
        timestamp: new Date().toISOString(),
      }],
    }),
  });
  if (!res.ok) {
    return new Response(`discord error: ${res.status}`, { status: 502 });
  }

  return new Response(preview ? "preview sent" : "reviewed");
});
