// discord-review: pg_cron이 매일 1회(KST 10:00 = 01:00 UTC) 호출하는 복습 카드 함수.
// "어제(KST) 제출한 노트" 중 최신 1건을 Gemini에 넣어 영어 설명 + 한국어 예문
// 복습 카드를 생성해 디스코드로 발송한다. 어제 제출이 없으면 조용히 패스.
// ?preview=1 을 붙이면 어제 조건을 무시하고 "노트 있는 최신 제출"로 즉시 발송.
//
// 안정성(2026-07-16): Gemini 응답이 느린 날 pg_net 기본 5초 타임아웃에 함수가
// 잘려 카드가 누락되던 문제 확인. 대응 2종 —
//   (1) cron의 net.http_post에 timeout_milliseconds := 30000 (함수를 안 끊게)
//   (2) 아래 in-place 재시도: Gemini/디스코드가 일시 오류(429/5xx)일 때만 같은
//       실행 안에서 백오프 재시도. 디스코드 전송은 끝에 딱 1번(2xx면 즉시 종료,
//       네트워크 예외는 재시도 안 함) → 중복 발송 원천 차단.
// 가시성(2026-07-19): 재시도까지 다 실패하면 조용히 사라지지 말고 디스코드로
//   "⚠️ Review Card Failed + 이유" 알림 발송(notifyFailure). 카드 실패는 대개
//   Gemini 쪽이고 디스코드는 살아있어 알림은 대부분 닿는다. 단 함수가 30s
//   타임아웃에 통째로 잘리는 경우는 알림도 못 보낸다(한계).
// 배포: supabase functions deploy discord-review --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_URL = "https://leeleelee3264.github.io/ashleigh-korean-quest/";
const COLOR_BLUE = 0x60a5fa;
const COLOR_RED = 0xef4444;
const KST = 9 * 60 * 60 * 1000;
const GEMINI_MODEL = "gemini-2.5-flash";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class GeminiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "GeminiError";
  }
}

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
    throw new GeminiError(res.status, `gemini ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("gemini returned no text");
  return JSON.parse(text) as Card;
}

// Gemini 카드 생성 — 일시 오류(429/5xx)·네트워크 예외는 같은 실행 안에서
// 백오프(1s→2s→4s) 재시도. 400 등 영구 오류는 즉시 포기. 전송 전 단계라 부작용 없음.
async function generateCardWithRetry(
  apiKey: string,
  lessonTitle: string,
  note: string,
  attempts = 3,
): Promise<Card> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await generateCard(apiKey, lessonTitle, note);
    } catch (e) {
      lastErr = e;
      // GeminiError면서 429도 5xx도 아니면(=4xx 영구 오류) 재시도 무의미 → 즉시 포기.
      const permanent = e instanceof GeminiError && e.status !== 429 &&
        e.status < 500;
      if (permanent || i === attempts - 1) throw e;
      await sleep(1000 * 2 ** i);
    }
  }
  throw lastErr;
}

// 디스코드 전송 — 받은 응답이 429/5xx일 때만(메시지가 거부된 것이라 재전송해도
// 중복 없음) 백오프 재시도. 2xx면 즉시 반환. fetch가 던지는 네트워크 예외는
// "보냈는지 불확실"이라 재시도하지 않는다(중복 방지 > 재전송).
async function postDiscord(
  webhook: string,
  payload: unknown,
  attempts = 3,
): Promise<Response> {
  let res!: Response;
  for (let i = 0; i < attempts; i++) {
    res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok || !(res.status === 429 || res.status >= 500)) return res;
    if (i === attempts - 1) return res;
    const ra = Number(res.headers.get("retry-after"));
    await sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 1000 * 2 ** i);
  }
  return res;
}

// 카드 생성/발송이 끝내 실패하면 조용히 죽지 말고 디스코드로 "실패했다 + 이유"를
// 알린다(best-effort). 카드 실패는 대개 Gemini 쪽이고 디스코드 발송은 멀쩡하니
// 이 알림은 대부분 도착한다. 여기서 또 터지면 그냥 삼킨다(무한 루프 방지).
async function notifyFailure(
  webhook: string,
  lessonTitle: string | undefined,
  reason: string,
): Promise<void> {
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          author: { name: "⚠️ Review Card Failed" },
          title: lessonTitle ? `📓 ${lessonTitle}` : "Daily review card",
          fields: [{
            name: "Reason",
            value: reason.slice(0, 1000),
          }],
          color: COLOR_RED,
          footer: { text: "Korean Study Quest" },
          timestamp: new Date().toISOString(),
        }],
      }),
    });
  } catch (_) {
    // 실패 알림마저 실패 — 더 할 수 있는 게 없으므로 무시.
  }
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
    card = await generateCardWithRetry(apiKey, row.lesson_title, row.note);
  } catch (e) {
    // 재시도까지 다 소진 → 조용히 죽지 말고 실패 알림을 쏜다.
    await notifyFailure(webhook, row.lesson_title, `Gemini failed after retries — ${e}`);
    return new Response(`gemini error: ${e}`, { status: 502 });
  }

  // 전송은 딱 한 번(내부에서 429/5xx만 안전 재시도). preview 외에는 한 카드만 나감.
  const res = await postDiscord(webhook, {
    embeds: [{
      author: { name: "🔁 Daily Review" },
      title: card.title,
      url: SITE_URL,
      description: buildDescription(card),
      color: COLOR_BLUE,
      footer: { text: "Korean Study Quest • Review is where it sticks" },
      timestamp: new Date().toISOString(),
    }],
  });
  if (!res.ok) {
    // 카드 발송이 끝내 실패 — 같은 웹훅이 아직 살아있으면 실패 알림이라도 닿는다.
    await notifyFailure(webhook, row.lesson_title, `Discord rejected the card — HTTP ${res.status}`);
    return new Response(`discord error: ${res.status}`, { status: 502 });
  }

  return new Response(preview ? "preview sent" : "reviewed");
});
