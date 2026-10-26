// 홈페이지 아티스트 캐러셀 목록 (Cloudflare Pages Function)
//   GET /api/artists?limit=20  → { generatedAt, artists: [{ id, nameEn, imageUrl, followerCount }] }
//   굿덕 API를 서버에서 불러(API 키는 브라우저에 보내지 않는다) data/artists-hidden.json의 아티스트를 빼고 돌려준다.
//   결과는 10분 동안 Cloudflare 캐시에 둔다. 굿덕이 실패하면 502를 돌려주고, 화면은 data/news.json 목록을 쓴다.
//
// 필요한 환경 변수: GOODDUCK_API_KEY (굿덕 웹사이트 API 키, Secret)
import { GOODDUCK_ARTISTS, clampLimit, upstreamLimit, pickArtists, hiddenIdsOf } from "../_lib/artists.js";
import { json } from "../_lib/server.js";

const TTL = 600; // 초

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const limit = clampLimit(url.searchParams.get("limit"));
  const key = (env.GOODDUCK_API_KEY || "").trim();
  if (!key) return json({ error: env.GOODDUCK_API_KEY === undefined ? "굿덕 API 설정(GOODDUCK_API_KEY)이 아직 없습니다." : "굿덕 API 키(GOODDUCK_API_KEY) 값이 비어 있습니다." }, 503);

  // 숨김 목록은 배포된 정적 파일. 내용이 바뀌면 캐시 열쇠도 바뀌어 바로 반영된다.
  const hiddenDoc = await env.ASSETS.fetch(new URL("/data/artists-hidden.json", url)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const hidden = hiddenIdsOf(hiddenDoc);
  const cacheKey = new Request(`${url.origin}/api/artists?limit=${limit}&hidden=${encodeURIComponent(hidden.slice().sort().join(","))}`);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let data;
  try {
    const res = await fetch(`${GOODDUCK_ARTISTS}?limit=${upstreamLimit(limit, hidden.length)}`, {
      headers: { "X-Api-Key": key, accept: "application/json" }
    });
    data = await res.json().catch(() => null);
    if (!res.ok) {
      // 401 WEBSITE_40101: 키가 틀림. 키 값은 기록하지 않는다
      console.error("goodduck artists", res.status, data && data.code);
      return json({ error: "아티스트 목록을 불러오지 못했습니다.", upstream: res.status, code: data && data.code }, 502);
    }
  } catch (e) {
    console.error("goodduck artists", e.message);
    return json({ error: "아티스트 목록을 불러오지 못했습니다." }, 502);
  }

  const body = pickArtists(data, hidden, limit);
  const response = json(body, 200, { "cache-control": `public, max-age=${TTL}` });
  const save = cache.put(cacheKey, response.clone());
  if (waitUntil) waitUntil(save); else await save;
  return response;
}
