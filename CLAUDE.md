# 폰드메이커스 회사 홈페이지

폰드메이커스(PondMakers Inc.) 회사 소개 사이트. 예전 그누보드(카페24 호스팅) 사이트의 레이아웃과 내용을 정적 사이트로 옮겼다.
숲세권 라이브 공연 사이트(`PauliKim/forrestlive-site`)와 같은 방식(정적 파일 + Cloudflare Pages + 문구 어드민)으로 운영한다.
- 저장소: https://github.com/PauliKim/pondmakers-site (기본 브랜치 `main`)
- 배포: Cloudflare Pages 프로젝트 `pondmakers` → https://pondmakers.pages.dev (2026-10-23 연결 완료. 어드민 저장·문의 메일 환경 변수는 아직 없음 → `DEPLOY.md` 3·4단계)
- 정식 주소는 https://www.pondmakers.com (카페24 DNS에서 www만 CNAME으로 연결). 네임서버와 메일(MX, mailplug)은 건드리지 않는다.
- 개발은 www 사이트에서 한다. www 없는 pondmakers.com은 **개발이 끝날 때까지 예전 사이트(카페24 호스팅 pondmakers26)를 그대로 둔다.** 완료되면 루트도 이 사이트로 바꾼다(`DEPLOY.md` 5단계). 사용자가 끝났다고 하기 전에는 루트를 건드리지 않는다.

## 대화와 작성 언어
- 사용자와는 한국어로 대화한다.
- 커밋 메시지, 문서, 코드 주석, 화면 문구는 한국어로 쓴다.

## 구조 (빌드 단계 없음, 저장소 루트가 그대로 배포됨)
- `index.html` 한 페이지 마크업과 페이지 전용 스타일(한국어 페이지이자 세 언어의 틀). 구역: 첫 화면(#section01) · 비전(#section02) · 서비스(#section03) · 문화기술비전(#section04) · 뉴스(#section05) · 문의(#section06)
- `styles.css` 디자인 토큰(`:root`, 라이트·다크)과 공통 구성 요소. 토큰 원본은 Claude Design의 ‘폰드메이커스’ 디자인 시스템 → `DESIGN.md`
- `app.js` 슬라이드, 숫자 세기, 문화기술 장면 전환, 뉴스 목록, 문의 보내기, 어드민 미리보기 연결(`window.pondPreview`). 모든 경로는 상대 경로
- 다국어: 한국어 `/`, 영어 `/en/`, 일본어 `/ja/`(메뉴 표시는 KO·EN·JP)
  - `data/copy.json`(한국어), `data/copy.en.json`, `data/copy.ja.json` 고정 문구(번호별, 세 파일이 같은 번호). `data/copy-schema.json` 문구 항목 목록(구역, 위치, 자리표시). 사람이 고치는 곳
  - `en/index.html`, `ja/index.html`은 `scripts/apply_copy.py`가 index.html과 그 언어 copy 파일로 **만드는 파일**이다. 직접 고치지 않는다
  - `functions/_middleware.js` + `functions/_lib/lang.js` 첫 화면(/)에서 접속 나라로 이동: KR → `/`, JP → `/ja/`, 그 밖 → `/en/`. 언어 메뉴에서 고른 언어(쿠키 `lang`)가 앞서고, 검색 로봇과 어드민 미리보기(`?preview`)는 옮기지 않는다. `_routes.json`으로 `/`와 `/api/*`에서만 돈다
  - 개인정보처리방침·이메일무단수집거부는 한국어 페이지 하나만 있다(영어·일본어 바닥글에서 "(Korean)" 표시로 연결)
- `data/news.json` 뉴스 카드 목록(제목, 그림, 링크). 그림은 `assets/news/`
- `policy/privacy.html`, `policy/email.html` 개인정보처리방침, 이메일무단수집거부(예전 사이트 내용 그대로). 문구 어드민 대상이 아니라 파일을 직접 고친다
- `admin/` 문구 관리 화면(/admin). `functions/api/copy.js` 저장 서버(Access 로그인 확인 후 GitHub에 커밋). `functions/_lib/copy.js` 공용 함수
- `functions/api/contact.js` 문의 메일 보내기(Resend). `functions/_lib/contact.js` 검사·메일 본문 함수
- `scripts/apply_copy.py` 세 언어 copy 문구를 페이지의 `data-copy`·`data-copy-ph`·`data-copy-aria`·`data-copy-alt`에 써 넣고 en/·ja/ 페이지를 만든다. `tests/test_copy.py` 문구·다국어·뉴스 점검(맥에서는 서버 JS와 나라별 이동 규칙도 osascript로 점검)
- `_headers` 캐시 설정, `_redirects` 예전 그누보드 주소(`/bbs/…`, `/theme/basic/policy/…`) → 새 주소
- `assets/` 로고·파비콘·공유 이미지(`logo/`), 사진·아이콘(`img/`), 뉴스 그림(`news/`), 글꼴(Pretendard 분할 파일, Outfit — 둘 다 OFL)

## 자주 쓰는 명령
- 미리보기: `python3 -m http.server 8000` → http://localhost:8000 (문의 보내기·어드민 저장은 Pages 배포본에서만 동작)
- 문구 점검: `python3 tests/test_copy.py` (문구, index.html, app.js, news.json, functions/를 고치면 반드시 실행)
- 문구 반영·언어 페이지 만들기: `python3 scripts/apply_copy.py` (copy 파일이나 index.html을 고친 뒤 **항상**. 안 하면 en/·ja/ 페이지가 옛 구조로 남는다)
- 미리보기에서 언어 페이지: http://localhost:8000/en/ , /ja/ (나라별 이동은 Pages에서만 동작)

## 배포 흐름
- `main`에 push하면 Cloudflare Pages가 1분 안에 배포한다. 별도 스테이징이 없다.
  - 화면이나 스크립트를 바꾸면 로컬 미리보기로 확인한 뒤 push한다.
  - 큰 변경은 브랜치를 만들어 push한다. `<브랜치>.pondmakers.pages.dev` 미리보기 주소에서 확인 후 main에 합친다.
- 어드민 저장은 main에 바로 커밋된다(작성자 pondmakers-admin). 사람 작업 전에 항상 `git pull --rebase origin main`.

## 화면·문구 원칙
- 예전 pondmakers.com과 같은 결: 하늘색→흰색 첫 화면, 남색·파랑 그라데이션(`--gradient`), 큰 굵은 제목, 30px 둥근 카드, 반짝이 장식.
- 디자인 값은 `styles.css` 토큰만 쓴다. 새 색이나 글꼴을 임의로 넣지 않는다. 기준은 Claude Design 디자인 시스템(https://claude.ai/artifact/JE6k6ucpHfAk7YcjrxkWVz), 값을 바꾸면 그쪽과 함께 바꾼다(`DESIGN.md`).
- 라이트·다크 두 테마를 지원한다(시스템 설정을 따르고 `data-theme`이 덮어씀). 색은 토큰으로만 쓰고, 화면을 바꾸면 두 테마 모두 확인한다. 문의 구역(`inverse`)은 테마와 상관없이 어둡다.
- 글꼴: 한글 Pretendard(`--font-ko`), 영문 머리말·숫자 Outfit(`--font-en`).
- 고정 문구는 `data/copy.json`에서만 고친다. index.html·app.js에 문구를 직접 쓰지 않는다.
  - index.html: 요소에 `data-copy="번호"`를 달고 기본 문구를 넣는다(안에는 글자와 `<br>`만). 속성은 `data-copy-ph`(placeholder), `data-copy-aria`(aria-label), `data-copy-alt`(alt), 그 속성보다 앞에. 고친 뒤 `python3 scripts/apply_copy.py`
  - 화면에 보이지 않는 글(단추 이름, 그림 설명)도 번호로 둔다(K 구역). 한국어를 index.html·app.js에 직접 쓰면 영어·일본어 페이지에 한국어가 남는다(테스트가 잡는다)
  - 새 상대 주소(src, href, url())는 en/·ja/에서 자동으로 `../`가 붙는다. app.js에서 파일을 부를 때는 `ROOT + 경로`
  - app.js: `t("번호", { 이름 })`, HTML에 넣을 때는 `et()`. 미리보기 위치 표시용으로 `data-copy-dyn="번호"`를 단다
  - 새 문구는 `data/copy-schema.json`과 세 copy 파일에 같은 번호로 추가한다(영어·일본어 번역 포함). `scripts/apply_copy.py`와 `functions/_lib/copy.js`의 applyCopy는 같은 동작을 유지한다
- 숫자 실적(D-10 등)은 숫자로 시작하면 0부터 올라가며 나타난다(`100+`, `20M+`).
- 뉴스는 `data/news.json`에 위에서부터 나오는 순서로 적고, 그림은 900px 이하 JPG로 `assets/news/`에 넣는다.
- 소개 문구는 사람이 쓴 것처럼 담백하게. 과장된 수식어나 AI 같은 말투를 쓰지 않는다.
- 모바일 폭(375px)과 다크 테마에서도 확인한다.

## 보안
- 문구 저장 서버의 `GITHUB_TOKEN`, `ACCESS_AUD`, 문의 메일의 `RESEND_API_KEY`, `TURNSTILE_SECRET` 등은 Cloudflare Pages 환경 변수에만 둔다. 코드·커밋·로그에 쓰지 않는다.
- 문의 내용(개인정보)은 메일로만 보내고 저장소·로그에 남기지 않는다.
- `.env`, `.dev.vars`는 커밋하지 않는다(.gitignore).

## 참고 문서
- `DEPLOY.md` GitHub·Cloudflare Pages 연결, 문구 어드민·문의 메일 설정, 도메인 옮기기
- `DESIGN.md` 디자인 토큰과 글꼴 라이선스
