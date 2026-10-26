// 아티스트 숨김 관리 서버 (Cloudflare Pages Function, 어드민 /admin/artists.html에서 씀)
//   GET  /api/artists-admin  → 굿덕이 주는 전체 후보(숨김 포함, 캐시 없음) + 지금 숨김 목록과 버전(sha), 로그인한 이메일
//   POST /api/artists-admin  → { hidden: [{ id, name }], sha } 를 받아 data/artists-hidden.json을 main에 커밋
// 로그인 확인은 문구 저장 서버와 같다(../_lib/server.js). GOODDUCK_API_KEY, GITHUB_TOKEN 필요.
import { GOODDUCK_ARTISTS, MAX_LIMIT, pickArtists, hiddenIdsOf } from "../_lib/artists.js";
import { json, fail, signedInEmail, getFile, putFile } from "../_lib/server.js";

const HIDDEN_PATH = "data/artists-hidden.json";

export async function onRequestGet({ request, env }) {
  try {
    const email = await signedInEmail(request, env);
    const key = (env.GOODDUCK_API_KEY || "").trim();
    if (!key) throw fail(env.GOODDUCK_API_KEY === undefined ? "굿덕 API 설정(GOODDUCK_API_KEY)이 아직 없습니다." : "굿덕 API 키(GOODDUCK_API_KEY) 값이 비어 있습니다.", 503);
    const [file, res] = await Promise.all([
      getFile(env, HIDDEN_PATH),
      fetch(`${GOODDUCK_ARTISTS}?limit=${MAX_LIMIT}`, { headers: { "X-Api-Key": key, accept: "application/json" } })
    ]);
    const data = await res.json().catch(() => null);
    if (!res.ok) throw fail(`굿덕 아티스트 목록을 불러오지 못했습니다(${res.status}${data && data.code ? ` ${data.code}` : ""}).`, 502);
    const doc = JSON.parse(file.text);
    return json({ email, sha: file.sha, hidden: doc.hidden || [], ...pickArtists(data, [], MAX_LIMIT) });
  } catch (e) {
    return json({ error: e.message }, e.status || 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const email = await signedInEmail(request, env);
    const { hidden, sha } = await request.json();
    if (!Array.isArray(hidden) || hidden.length > 200) return json({ error: "숨김 목록 형식이 올바르지 않습니다." }, 400);
    const clean = [];
    for (const h of hidden) {
      const id = String(h && h.id || "").trim();
      const name = String(h && h.name || "").trim().slice(0, 100);
      if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return json({ error: `${id || "(빈 값)"}: 아티스트 id 형식이 올바르지 않습니다.` }, 400);
      if (!clean.some((c) => c.id === id)) clean.push({ id, name });
    }
    const current = await getFile(env, HIDDEN_PATH);
    if (sha !== current.sha) return json({ error: "다른 곳에서 먼저 저장되었습니다. 새로고침한 뒤 다시 골라 주세요." }, 409);
    const doc = JSON.parse(current.text);
    const before = hiddenIdsOf(doc).sort().join(",");
    if (before === clean.map((c) => c.id).sort().join(",")) return json({ ok: true, sha: current.sha, changed: false });
    const next = { ...doc, hidden: clean };
    const names = clean.map((c) => c.name || c.id);
    const message = `아티스트 숨김 ${clean.length}명${names.length ? `: ${names.slice(0, 5).join(", ")}${names.length > 5 ? ` 외 ${names.length - 5}명` : ""}` : ""}\n\n어드민에서 ${email}이 저장`;
    const saved = await putFile(env, HIDDEN_PATH, JSON.stringify(next, null, 1), current.sha, message);
    return json({ ok: true, sha: saved.content.sha, changed: true });
  } catch (e) {
    return json({ error: e.message }, e.status || 500);
  }
}
