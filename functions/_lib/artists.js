// 굿덕 아티스트 목록을 홈페이지 캐러셀용으로 다듬는 순수 함수들(네트워크 없음, tests에서 점검).
// 굿덕 API: GET https://api-app-v2.goodduck.xyz/api/website/artists?limit=1~100, 헤더 X-Api-Key
//   → { generatedAt, artists: [{ id, nameEn, imageUrl, followerCount }] }
//   굿덕 서버가 이미 "멤버십 또는 프라이빗 채팅 판매 중" 아티스트만, 팔로우(입덕) 많은 순으로 준다.

export const GOODDUCK_ARTISTS = "https://api-app-v2.goodduck.xyz/api/website/artists";
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// 1~100 정수로 맞춘다
export function clampLimit(value, fallback = DEFAULT_LIMIT) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_LIMIT, Math.max(1, n));
}

// 숨긴 아티스트를 빼고도 limit명을 채우려면 굿덕에 몇 명을 달라고 할지
export const upstreamLimit = (limit, hiddenCount) => Math.min(MAX_LIMIT, limit + hiddenCount);

const isHttps = (u) => typeof u === "string" && /^https:\/\/[^\s"'<>]+$/.test(u);

// 굿덕 응답 → 홈페이지가 쓰는 목록. 이상한 항목(이름·https 그림 없음, 같은 id 반복)과 숨긴 아티스트는 뺀다.
// 순서는 팔로우 많은 순(굿덕이 준 순서가 같으면 그대로)
export function pickArtists(data, hiddenIds = [], limit = DEFAULT_LIMIT) {
  const hidden = new Set(hiddenIds.map(String));
  const seen = new Set();
  const list = (data && Array.isArray(data.artists) ? data.artists : [])
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => {
      if (!a || a.id == null) return false;
      const id = String(a.id);
      if (seen.has(id) || hidden.has(id)) return false;
      seen.add(id);
      return typeof a.nameEn === "string" && a.nameEn.trim() !== "" && isHttps(a.imageUrl);
    })
    .sort((x, y) => (Number(y.a.followerCount) || 0) - (Number(x.a.followerCount) || 0) || x.i - y.i)
    .slice(0, limit)
    .map(({ a }) => ({ id: String(a.id), nameEn: a.nameEn.trim(), imageUrl: a.imageUrl, followerCount: Number(a.followerCount) || 0 }));
  return { generatedAt: (data && data.generatedAt) || null, artists: list };
}

// data/artists-hidden.json → 숨긴 id 목록
export const hiddenIdsOf = (doc) => ((doc && Array.isArray(doc.hidden)) ? doc.hidden : []).map((h) => String(typeof h === "object" ? h.id : h)).filter(Boolean);
