// 문구 저장 서버 (Cloudflare Pages Function)
//   GET  /api/copy?lang=ko|en|ja  → 지금 main에 있는 그 언어 문구와 버전(sha), 로그인한 이메일
//   POST /api/copy  → { lang, items, sha } 를 받아 그 언어의 copy 파일과 페이지를 main에 커밋
//                     (ko: data/copy.json·index.html, en: data/copy.en.json·en/index.html, ja: data/copy.ja.json·ja/index.html)
//
// 로그인 확인·GitHub 읽기·쓰기와 필요한 환경 변수는 ../_lib/server.js
import { applyCopy, validateItems, LANG_FILES } from "../_lib/copy.js";
import { json, fail, signedInEmail, getFile, putFile } from "../_lib/server.js";

const filesFor = (lang = "ko") => {
  const f = LANG_FILES[lang];
  if (!f) throw fail(`${lang}: 없는 언어입니다.`, 400);
  return f;
};

export async function onRequestGet({ request, env }) {
  try {
    const email = await signedInEmail(request, env);
    const lang = new URL(request.url).searchParams.get("lang") || "ko";
    const file = await getFile(env, filesFor(lang).copy);
    return json({ email, lang, sha: file.sha, copy: JSON.parse(file.text) });
  } catch (e) {
    return json({ error: e.message }, e.status || 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const email = await signedInEmail(request, env);
    const { items, sha, lang = "ko" } = await request.json();
    const files = filesFor(lang);
    const current = await getFile(env, files.copy);
    if (sha !== current.sha) return json({ error: "다른 곳에서 문구가 먼저 저장되었습니다. 새로고침해서 최신 문구를 불러온 뒤 다시 고쳐 주세요." }, 409);
    const copy = JSON.parse(current.text);
    const schema = await env.ASSETS.fetch(new URL("/data/copy-schema.json", request.url)).then((r) => r.json());
    const errors = validateItems(items, schema, copy.items);
    if (errors.length) return json({ error: "저장하지 못했습니다.", details: errors }, 400);

    const changed = Object.keys(items).filter((k) => items[k] !== copy.items[k]);
    if (!changed.length) return json({ ok: true, sha: current.sha, changed: [] });

    // copy 파일 먼저, 그다음 같은 문구를 넣은 그 언어 페이지
    const order = schema.groups.flatMap((g) => g.items.map((i) => i.id));
    const nextCopy = { ...copy, items: Object.fromEntries(order.map((id) => [id, items[id]])) };
    const tag = lang === "ko" ? "" : `(${lang.toUpperCase()})`;
    const message = `문구 수정${tag}: ${changed.slice(0, 6).join(", ")}${changed.length > 6 ? ` 외 ${changed.length - 6}개` : ""}\n\n어드민에서 ${email}이 저장`;
    const saved = await putFile(env, files.copy, JSON.stringify(nextCopy, null, 1), current.sha, message);

    let htmlNote = "";
    try {
      const page = await getFile(env, files.page);
      const next = applyCopy(page.text, nextCopy.items);
      if (next !== page.text) await putFile(env, files.page, next, page.sha, `${message.split("\n")[0]} (${files.page} 반영)`);
    } catch (e) {
      htmlNote = `문구는 저장했지만 ${files.page} 반영에 실패했습니다: ${e.message}. 화면에는 문구가 그대로 보이고, 검색·공유 미리보기만 늦게 바뀝니다.`;
    }
    return json({ ok: true, sha: saved.content.sha, changed, note: htmlNote });
  } catch (e) {
    return json({ error: e.message }, e.status || 500);
  }
}
