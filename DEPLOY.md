# GitHub · Cloudflare Pages 세팅 가이드

폰드메이커스 홈페이지를 GitHub에 올리고 Cloudflare Pages로 배포하는 방법입니다. 숲세권 라이브 공연 사이트와 같은 순서입니다.

```
Claude Code·어드민에서 수정 → GitHub main에 커밋
   │  (Cloudflare Pages가 커밋을 감지)
   ▼
사이트 자동 배포 (보통 1분 이내)
```

## 1단계. GitHub 저장소 (완료)

**https://github.com/PauliKim/pondmakers-site** (공개). 코드와 화면 문구는 원래 공개 정보라 공개 저장소여도 문제가 없습니다. 비밀값은 저장소에 넣지 않고 Cloudflare 환경 변수에만 둡니다.

## 2단계. Cloudflare Pages 연결 (완료, 2026-10-23)

지금 상태: 프로젝트 `pondmakers`(Kimmhaa@gmail.com 계정) → https://pondmakers.pages.dev, 운영 브랜치 `main`, 빌드 명령 없음, 출력 `/`. GitHub의 Cloudflare Workers and Pages 앱에 `forrestlive-site`, `pondmakers-site` 두 저장소만 허용되어 있습니다.

처음부터 다시 할 때:

1. https://dash.cloudflare.com → 왼쪽 **Workers & Pages** → **Create** → **Pages** 탭 → **Connect to Git**
2. **GitHub** → Cloudflare Pages 앱 설정에서 저장소 접근에 `pondmakers-site`를 추가합니다(숲세권 때 **Only select repositories**로 설치했다면 목록에 하나 더 고르기).
3. 저장소 `PauliKim/pondmakers-site` 선택 → **Begin setup**
4. 빌드 설정
   - Project name: `pondmakers` (주소가 `https://pondmakers.pages.dev`가 됩니다. 이미 쓰이고 있으면 다른 이름으로 하고 `admin/index.html`의 주소도 바꿉니다)
   - Production branch: `main`
   - Framework preset: **None**, Build command: **비워 둠**, Build output directory: `/`
5. **Save and Deploy** → 1분 뒤 `https://pondmakers.pages.dev`에서 확인

## 3단계. 문구 관리 화면(/admin) 켜기 (완료)

지금 상태: Access 애플리케이션 `폰드메이커스 문구 관리`(pondmakers.pages.dev/admin, /api/copy, 정책 `문구 관리 허용`, 팀 `forrestlive.cloudflareaccess.com`), Pages 변수 `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ADMIN_EMAILS`, Secret `GITHUB_TOKEN`(fine-grained `pondmakers-admin`, pondmakers-site Contents 읽기·쓰기, 1년 만료 — 만료 전에 새로 만들어 바꿈). **저장 확인 완료(2026-10-24)**: E-01을 바꿔 저장 → `pondmakers-admin` 커밋 2개(copy.json, index.html) → 약 25초 뒤 운영 반영 → 원래 문구로 되돌려 다시 저장.

`https://pondmakers.pages.dev/admin/`에서 문구를 고치고 미리 본 뒤 저장하면 `data/copy.json`과 `index.html`이 main에 커밋됩니다. 설정 전에도 화면과 미리보기는 되지만 저장 버튼은 꺼져 있습니다.

### 3-1. GitHub 토큰
1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → **Generate new token**
2. 이름 `pondmakers-admin`, 만료 1년, Repository access: **Only select repositories** → `pondmakers-site`
3. Repository permissions → **Contents: Read and write**
4. 만든 값(`github_pat_…`)을 3-3에 바로 넣습니다. 메신저나 문서에 붙여 넣지 않습니다.

### 3-2. Cloudflare Access로 로그인 걸기
1. **Zero Trust** → **Access → Applications → Add an application → Self-hosted** (숲세권 때 만든 팀 `forrestlive.cloudflareaccess.com`을 그대로 써도 됩니다)
   - Application name: `폰드메이커스 문구 관리`, Session duration: `24 hours`
   - Domain: `pondmakers.pages.dev`, Path: `admin`
   - 한 줄 더: `pondmakers.pages.dev`, Path: `api/copy`
2. 로그인 방법: One-time PIN
3. Policy: Allow, Include → Emails → 문구를 고칠 사람들의 이메일
4. 저장 후 **Application Audience (AUD) Tag** 복사

pondmakers.com의 DNS가 카페24에 있어 pondmakers.com에는 Access를 걸 수 없습니다. 그래서 관리 화면은 `pondmakers.pages.dev/admin/`에서 쓰고, `pondmakers.com/admin/`으로 들어오면 그리로 넘어갑니다.

### 3-3. Cloudflare Pages 환경 변수
**Workers & Pages → pondmakers → Settings → Variables and Secrets** → Production:

| 이름 | 값 | 종류 |
|---|---|---|
| `GITHUB_TOKEN` | 3-1의 토큰 | Secret |
| `ACCESS_TEAM_DOMAIN` | 팀 주소, 예: `forrestlive.cloudflareaccess.com` | Text |
| `ACCESS_AUD` | 3-2의 AUD Tag | Text |
| `ADMIN_EMAILS` (선택) | 허용 이메일, 쉼표로 | Text |

값을 넣은 뒤 **Deployments → 맨 위 배포 → Retry deployment**.

## 4단계. 문의 메일 켜기 (완료)

지금 상태(2026-10-23):
- Turnstile 위젯 `폰드메이커스 문의 양식`(pondmakers.pages.dev, pondmakers.com) 생성, 사이트 키는 index.html에.
- Resend 팀 `kimmhaa`에 `pondmakers.com` **Verified**(도쿄). 다른 Resend 팀에 등록돼 있던 것을 소유 인증으로 가져옴.
- 카페24 DNS에 추가한 레코드: TXT `@` `resend-domain-verification=…`, TXT `resend._domainkey`(DKIM), TXT `_dmarc` `v=DMARC1; p=none;`, CNAME `send` → `send.forge.rmta.net`, CNAME `rsend` → `rsend-apne1.forge.rmta.net`. 루트 MX(mailplug)와 SPF는 그대로. Resend가 보여 주는 **수신용 루트 MX(receive-…)는 넣지 않는다**(회사 메일이 mailplug에서 빠져나감).
- Pages 변수 `CONTACT_FROM` = `폰드메이커스 홈페이지 <noreply@pondmakers.com>`.
- Pages Secret `RESEND_API_KEY`, `TURNSTILE_SECRET` 입력 후 다시 배포(2026-10-24). **문의 메일 동작 확인 완료**: 운영 사이트 양식에서 보낸 점검 문의가 Resend에서 contact@pondmakers.com으로 Delivered. Turnstile 토큰 없는 요청은 400으로 거부됨.
- 보낸 기록은 Resend → Emails에서 봅니다. 받는 주소를 바꾸려면 Pages 변수 `CONTACT_TO`(쉼표로 여러 개)를 넣고 다시 배포합니다.

문의 양식은 `functions/api/contact.js`가 메일로 보냅니다(Resend 사용, 월 3,000통 무료). 설정 전에는 "contact@pondmakers.com로 메일을 보내 주세요"라는 안내와, 입력한 내용이 담긴 메일 쓰기 링크가 나옵니다.

1. https://resend.com 가입 → **Domains → Add domain** → `pondmakers.com` → 안내하는 DNS 레코드(TXT·MX, `send.` 하위 주소)를 카페24 DNS에 추가 → Verified 확인
   - 이 레코드는 `send.pondmakers.com` 같은 하위 주소에 붙어서 지금 쓰는 mailplug 메일(MX)과 겹치지 않습니다.
2. **API Keys → Create API Key** (Sending access)
3. Cloudflare Pages 환경 변수:

| 이름 | 값 | 종류 |
|---|---|---|
| `RESEND_API_KEY` | 2의 키 | Secret |
| `CONTACT_FROM` | `폰드메이커스 홈페이지 <noreply@pondmakers.com>` | Text |
| `CONTACT_TO` (선택) | 받는 주소, 쉼표로. 없으면 contact@pondmakers.com | Text |

### 스팸 방지(선택)
예전 사이트의 숫자 입력(캡차) 대신 Cloudflare Turnstile을 씁니다.
1. Cloudflare → **Turnstile → Add widget** → 도메인 `pondmakers.com`, `pondmakers.pages.dev` → Managed
2. 사이트 키를 `index.html`의 `<form class="inquiry-form" … data-turnstile="">` 안에 넣고 커밋
3. 비밀 키를 환경 변수 `TURNSTILE_SECRET`(Secret)에 넣고 다시 배포

## 4-1단계. 아티스트 캐러셀(굿덕 API)

- Pages Secret `GOODDUCK_API_KEY`: 굿덕 웹사이트 API 키. 값이 비어 있거나 틀리면 `/api/artists`가 503·502를 돌려주고, 홈페이지는 `data/news.json` 고정 목록을 보여 준다.
- 키를 바꾸면 다시 배포해야 적용된다(Deployments → 맨 위 → Retry deployment).
- 확인: `https://www.pondmakers.com/api/artists?limit=5` 가 `{"generatedAt":…, "artists":[…]}` 이면 정상.
- 숨김 관리: https://pondmakers.pages.dev/admin/artists.html (문구 관리와 같은 로그인).

## 4-2단계. SEO 설정

- https://pondmakers.pages.dev/admin/seo.html (문구 관리와 같은 로그인, 같은 `GITHUB_TOKEN`). 저장 확인 완료(2026-10-26): 회사 정보 SNS 주소를 넣고 저장 → `pondmakers-admin` 커밋 하나(seo.json과 세 페이지) → 약 25초 뒤 운영 반영 → 원래대로 되돌려 저장.
- 검색엔진 등록: Google Search Console, 네이버 서치어드바이저에 `https://www.pondmakers.com`을 등록하고 "HTML 태그" 소유 확인 값을 SEO 설정에 넣어 저장 → 1~2분 뒤 확인. 그다음 사이트맵 `https://www.pondmakers.com/sitemap.xml` 제출.

## 5단계. pondmakers.com 도메인 옮기기 (www 연결로 결정, 2026-10-23)

결정: 네임서버는 카페24에 그대로 두고 **www.pondmakers.com만** 새 사이트로 연결합니다. 메일(mailplug MX, SPF TXT)은 건드리지 않습니다.

- [x] Cloudflare Pages → pondmakers → Custom domains에 `www.pondmakers.com` 추가(“My DNS provider”)
- [x] 카페24 DNS 관리 → pondmakers.com → 별칭(CNAME) 관리 → `www` 레코드를 `pondmakers.com` → **`pondmakers.pages.dev`**로 수정(2026-10-23, 바로 반영됨)
- [x] Cloudflare에서 `www.pondmakers.com` **Active**(2026-10-23). HTTPS 인증서 Google Trust Services, 자동 갱신.
- 참고: www 주소의 `/admin/`은 화면이 `pondmakers.pages.dev/admin/`으로 넘기고, `/api/copy`는 로그인 토큰이 없으면 401로 거부합니다.
- [x] 루트(pondmakers.com) → `https://www.pondmakers.com` 301 넘기기(2026-10-26). 카페24 **도메인 포워딩은 쓸 수 없어**(pondmakers.com이 호스팅 `pondmakers26`에 연결돼 있음) 호스팅 웹 루트 `.htaccess` 맨 위에 넣었다. 카페24 호스팅에는 웹 파일 관리자가 없어 FTP(`pondmakers.com`:21, 아이디 `pondmakers26`, 웹 루트는 FTP 첫 폴더)로 올린다: `zsh scripts/root_redirect.sh` (비밀번호는 실행한 사람이 입력, `--undo`로 되돌리기, 원래 파일은 `~/Desktop/pondmakers-htaccess-backup/`).

  ```apache
  RewriteEngine On
  RewriteCond %{HTTP_HOST} ^pondmakers\.com$ [NC]
  RewriteRule ^(.*)$ https://www.pondmakers.com/$1 [R=301,L]
  ```
  확인: `https://pondmakers.com/…` → `https://www.pondmakers.com/…`(경로 유지, 예전 게시판 주소는 `_redirects`가 이어서 처리). 브라우저 주소창에 pondmakers.com을 치면 새 사이트가 열린다.
  알려진 문제: `http://`(s 없는) 주소는 카페24 서버가 `http://같은주소/`로 계속 돌려보내 열리지 않는다. 넘기기를 넣기 전부터 있던 카페24 쪽 동작이다(규칙과 상관없는 `pondmakers26.mycafe24.com`도 똑같다). 주소창 입력은 브라우저가 https로 먼저 열어 문제없다.
- 카페24 호스팅을 해지하면 이 넘기기도 사라진다. 해지 전에 아래 "네임서버를 Cloudflare로 옮기기"를 하고 Pages에 `pondmakers.com`을 추가한다.
- [ ] 넘기기가 확인되면 카페24 호스팅 자료(문의 기록 DB, 게시판) 백업

사이트의 canonical·sitemap·공유 이미지 주소는 이미 `https://www.pondmakers.com/`으로 맞춰 두었습니다.

### 다른 방법(참고)

지금 pondmakers.com은 카페24 호스팅(220.73.160.28)을 가리키고, 네임서버도 카페24입니다. 메일은 mailplug(MX)입니다.

- **권장: 네임서버를 Cloudflare로 옮기기.** Cloudflare에 사이트 `pondmakers.com`을 추가하면 기존 DNS 레코드를 읽어 옵니다. MX(mailplug)와 TXT가 그대로 들어왔는지 확인한 뒤, 가비아(도메인 등록처)에서 네임서버를 Cloudflare가 알려 준 두 개로 바꿉니다. 그다음 Pages → Custom domains에 `pondmakers.com`, `www.pondmakers.com`을 추가합니다. 이렇게 하면 루트 주소 연결이 쉽고 pondmakers.com에도 Access를 걸 수 있습니다.
- 대안: 카페24 DNS에서 `www`만 CNAME `pondmakers.pages.dev`로 바꾸기. 루트(pondmakers.com)는 CNAME을 걸 수 없어 카페24 쪽 www 넘기기 설정이 따로 필요합니다.
- 바꾸기 전에 카페24 호스팅에 남은 자료(문의 기록 DB, 게시판)를 백업합니다. 예전 주소(`/bbs/board.php…`, `/theme/basic/policy/sub01.php` 등)는 `_redirects`가 새 주소로 넘깁니다.

## 운영하면서

### 문구 고치기
- 어드민(`/admin`)에서 고치거나, Claude Code에서 `data/copy.json`을 고치고 `python3 scripts/apply_copy.py` → `python3 tests/test_copy.py` → 커밋·push

### 뉴스 추가
1. 그림을 900px 이하 JPG로 줄여 `assets/news/`에 넣습니다(맥: `sips -s format jpeg -Z 900 원본.png --out assets/news/이름.jpg`).
2. `data/news.json` 맨 위에 `{ "title": "…", "image": "assets/news/이름.jpg", "date": "2026-10-23", "url": "" }` 추가
3. `python3 tests/test_copy.py`로 그림 경로 확인 후 커밋

### 로컬에서 미리 보기
```bash
cd ~/Desktop/pondmakers-site
python3 -m http.server 8000
```
브라우저에서 http://localhost:8000 (문의 보내기와 어드민 저장은 Cloudflare에서만 동작)
