// 문의 보내기 서버 (Cloudflare Pages Function)
//   POST /api/contact  → { type, name, phone, email, message, agree, website, "cf-turnstile-response" }
//   문의 내용을 메일로 보낸다(Resend API). 저장소나 로그에는 남기지 않는다.
//
// 필요한 환경 변수(Cloudflare Pages 설정 → 환경 변수):
//   RESEND_API_KEY   Resend(https://resend.com) API 키. 비밀값으로
//   CONTACT_FROM     보내는 주소. Resend에서 인증한 도메인이어야 한다. 예: 폰드메이커스 홈페이지 <noreply@pondmakers.com>
// 선택:
//   CONTACT_TO       받는 주소(쉼표로 여러 개). 없으면 contact@pondmakers.com
//   TURNSTILE_SECRET Cloudflare Turnstile 비밀 키. 넣으면 스팸 방지 확인을 한다(index.html form의 data-turnstile에 사이트 키)
// RESEND_API_KEY나 CONTACT_FROM이 없으면 503을 돌려주고, 화면은 메일 쓰기 링크로 안내한다.
import { validateContact, contactMail } from "../_lib/contact.js";

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY || !env.CONTACT_FROM) return json({ error: "문의 메일 설정이 아직 없습니다." }, 503);
  let data;
  try { data = await request.json(); } catch { return json({ error: "형식이 올바르지 않습니다." }, 400); }
  // 사람 눈에 보이지 않는 칸(website)이 채워져 있으면 자동 등록으로 보고 조용히 끝낸다
  if (data.website) return json({ ok: true });
  const errors = validateContact(data);
  if (errors.length) return json({ error: errors[0], details: errors }, 400);

  if (env.TURNSTILE_SECRET) {
    const form = new FormData();
    form.append("secret", env.TURNSTILE_SECRET);
    form.append("response", data["cf-turnstile-response"] || "");
    form.append("remoteip", request.headers.get("cf-connecting-ip") || "");
    const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form }).then((r) => r.json()).catch(() => ({}));
    if (!check.success) return json({ error: "스팸 방지 확인에 실패했습니다. 다시 시도해 주세요." }, 400);
  }

  const to = (env.CONTACT_TO || "contact@pondmakers.com").split(",").map((s) => s.trim()).filter(Boolean);
  const mail = contactMail(data);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.CONTACT_FROM, to, reply_to: data.email.trim(), subject: mail.subject, text: mail.text })
  });
  if (!res.ok) return json({ error: `메일을 보내지 못했습니다(${res.status}).` }, 502);
  return json({ ok: true });
}
