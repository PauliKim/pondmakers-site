# 디자인 토큰

예전 pondmakers.com 테마(`theme/basic/css/site-custom.css`)의 `:root` 값을 그대로 옮겼다. 정의는 `styles.css` 맨 위.

## 색
| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `--c-primary` | #1F30FF | 포인트 파랑(머리말, 숫자, 메뉴 밑줄) |
| `--c-second` | #2999FF | 하늘 파랑(필수 표시, 포커스) |
| `--c-navy` | #16182B | 문의 바탕, 그라데이션 시작 |
| `--gradient` / `--gradient-up` | 남색 → 파랑 → 하늘 → 흰색 | 비전 아래쪽, 뉴스 바탕 |
| `--sky` | #E7F1FB → 흰색 | 첫 화면 바탕 |
| `--title` | #131822 | 제목 |
| `--text` | #666666 | 본문 |
| `--muted` | #90A0AF | 흐린 글자 |
| `--bg-light` | #F0F5FA | 아이콘 바탕, 흐르는 글자 |
| `--wave` | #E3EFFB | 첫 화면 물결 선 |

## 글꼴
- `--font-ko` Pretendard Variable — `assets/fonts/pretendard/` 분할 파일. SIL OFL 1.1 (`assets/fonts/pretendard/LICENSE.txt`)
- `--font-en` Outfit — `assets/fonts/outfit/`. SIL OFL 1.1 (`assets/fonts/outfit/OFL.txt`)

## 크기
글자 크기는 원본 단계(65·40·28·22·18 …)를 `--t-65` 같은 이름으로 두고 `clamp()`로 화면 폭에 맞춰 줄인다.
모서리는 `--r-20`, `--r-30`(카드), `--r-40`(큰 사진), `--r-pill`(버튼).
