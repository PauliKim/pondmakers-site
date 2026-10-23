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

## 2단계. Cloudflare Pages 연결

1. https://dash.cloudflare.com → 왼쪽 **Workers & Pages** → **Create** → **Pages** 탭 → **Connect to Git**
2. **GitHub** → Cloudflare Pages 앱 설정에서 저장소 접근에 `pondmakers-site`를 추가합니다(숲세권 때 **Only select repositories**로 설치했다면 목록에 하나 더 고르기).
3. 저장소 `PauliKim/pondmakers-site` 선택 → **Begin setup**
4. 빌드 설정
   - Project name: `pondmakers` (주소가 `https://pondmakers.pages.dev`가 됩니다. 이미 쓰이고 있으면 다른 이름으로 하고 `admin/index.html`의 주소도 바꿉니다)
   - Production branch: `main`
   - Framework preset: **None**, Build command: **비워 둠**, Build output directory: `/`
5. **Save and Deploy** → 1분 뒤 `https://pondmakers.pages.dev`에서 확인

## 3단계. 문구 관리 화면(/admin) 켜기

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

## 4단계. 문의 메일 켜기

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

## 5단계. pondmakers.com 도메인 옮기기 (결정 필요)

지금 pondmakers.com은 카페24 호스팅(220.73.160.28)을 가리키고, 네임서버도 카페24입니다. 메일은 mailplug(MX)입니다.

- **권장: 네임서버를 Cloudflare로 옮기기.** Cloudflare에 사이트 `pondmakers.com`을 추가하면 기존 DNS 레코드를 읽어 옵니다. MX(mailplug)와 TXT가 그대로 들어왔는지 확인한 뒤, 가비아(도메인 등록처)에서 네임서버를 Cloudflare가 알려 준 두 개로 바꿉니다. 그다음 Pages → Custom domains에 `pondmakers.com`, `www.pondmakers.com`을 추가합니다. 이렇게 하면 루트 주소 연결이 쉽고 pondmakers.com에도 Access를 걸 수 있습니다.
- 대안: 카페24 DNS에서 `www`만 CNAME `pondmakers.pages.dev`로 바꾸기. 루트(pondmakers.com)는 CNAME을 걸 수 없어 카페24 쪽 www 넘기기 설정이 따로 필요합니다.
- 도메인을 옮긴 뒤 `index.html`의 `og:image` 주소를 `https://pondmakers.com/…`으로 바꿉니다(지금은 pages.dev 주소).
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
