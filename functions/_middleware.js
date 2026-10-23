// 첫 화면(/)에서 접속한 나라에 맞는 언어 페이지로 옮긴다. 규칙은 _lib/lang.js.
// _routes.json으로 이 함수는 "/"와 "/api/*"에서만 돈다(그림·글꼴 같은 파일에는 돌지 않는다).
import { redirectTarget } from "./_lib/lang.js";

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const to = redirectTarget({
    method: request.method,
    pathname: url.pathname,
    search: url.search,
    country: request.cf && request.cf.country,
    cookie: request.headers.get("cookie"),
    userAgent: request.headers.get("user-agent")
  });
  if (!to) return next();
  // 사람마다 결과가 달라서 중간 캐시에 남기지 않는다
  return new Response(null, { status: 302, headers: { location: to, "cache-control": "private, no-store", vary: "cookie" } });
}
