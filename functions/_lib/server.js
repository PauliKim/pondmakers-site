// 어드민 서버들(문구 저장, 아티스트 숨김)이 함께 쓰는 것: JSON 응답, Access 로그인 확인, GitHub 파일 읽기·쓰기.
//
// 필요한 환경 변수(Cloudflare Pages 설정 → 환경 변수):
//   GITHUB_TOKEN        이 저장소의 Contents 읽기·쓰기만 허용한 fine-grained 토큰(Secret)
//   ACCESS_TEAM_DOMAIN  Cloudflare Access 팀 주소, 예: forrestlive.cloudflareaccess.com
//   ACCESS_AUD          /admin Access 애플리케이션의 AUD 태그
// 선택: ADMIN_EMAILS (쉼표로 구분한 허용 이메일. Access 정책에 더해 한 번 더 확인)
// 하나라도 없으면 저장하지 않는다.
import { verifyAccessToken, toBase64, fromBase64 } from "./copy.js";

export const REPO = "PauliKim/pondmakers-site";
export const BRANCH = "main";

export const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
});

export const fail = (message, status) => Object.assign(new Error(message), { status });

// Access가 넘겨준 로그인 토큰을 직접 검증하고 이메일을 돌려준다. 틀리면 status가 붙은 예외.
export async function signedInEmail(request, env) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw fail("로그인 설정(ACCESS_TEAM_DOMAIN, ACCESS_AUD)이 아직 없습니다.", 503);
  const team = env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const cookie = (request.headers.get("cookie") || "").match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  const token = request.headers.get("cf-access-jwt-assertion") || (cookie && cookie[1]);
  const certs = await fetch(`https://${team}/cdn-cgi/access/certs`, { cf: { cacheTtl: 3600 } }).then((r) => r.json());
  try {
    const email = await verifyAccessToken(token, { keys: certs.keys || [], aud: env.ACCESS_AUD, issuer: `https://${team}` });
    const allow = (env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (allow.length && !allow.includes(email.toLowerCase())) throw new Error(`${email}은 고칠 수 없는 계정입니다.`);
    return email;
  } catch (e) {
    throw Object.assign(e, { status: 401 });
  }
}

async function github(env, path, init = {}) {
  if (!env.GITHUB_TOKEN) throw fail("저장 설정(GITHUB_TOKEN)이 아직 없습니다.", 503);
  const res = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "pondmakers-admin",
      ...(init.body ? { "content-type": "application/json" } : {})
    }
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`GitHub ${res.status}: ${body.message || "요청 실패"}`), { status: res.status === 409 ? 409 : 502, github: res.status });
  return body;
}

export const getFile = async (env, path) => {
  const f = await github(env, `contents/${path}?ref=${BRANCH}`);
  return { sha: f.sha, text: fromBase64(f.content) };
};

export const putFile = (env, path, text, sha, message) => github(env, `contents/${path}`, {
  method: "PUT",
  body: JSON.stringify({
    message, branch: BRANCH, sha, content: toBase64(text),
    committer: { name: "pondmakers-admin", email: "pondmakers-admin@users.noreply.github.com" }
  })
});
