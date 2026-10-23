# 디자인 기준

폰드메이커스의 디자인 기준은 Claude Design의 **‘폰드메이커스’ 디자인 시스템**에 있습니다.
https://claude.ai/artifact/JE6k6ucpHfAk7YcjrxkWVz

색(라이트·다크), 글꼴, 간격, 모서리, 그림자와 브랜드 가이드(원칙, 문구, 로고, 사진, 아이콘, 구성 요소)는 그곳에서 보고 고칩니다.
이 저장소의 `styles.css` 맨 위 `:root`와 다크 블록은 그 값을 옮겨 적은 것입니다. 라이트 값은 예전 pondmakers.com 테마 값 그대로이고, 다크 값은 디자인 시스템에서 새로 정했습니다.

## 값을 바꿀 때

1. Claude Design에서 토큰이나 가이드를 고칩니다.
2. Claude에게 “디자인 시스템 바뀐 것 사이트에 반영해 줘”라고 하면 `styles.css`의 같은 이름 변수를 맞춰 고칩니다.

## 토큰 이름

디자인 시스템 토큰 이름과 `styles.css` 변수 이름이 같습니다(`accent` → `--accent`).

| 묶음 | 토큰 |
|---|---|
| 원색 | `primary` `second` `cyan` `navy` `logo-ink` |
| 쓰임 | `accent` `on-accent` `bg` `surface` `card` `title` `text` `muted` `line` `line-soft` `sky` `wave` `star` `icon-ground` `focus` |
| 어두운 구역 | `inverse` `on-inverse` `on-inverse-muted` `on-inverse-accent` `on-inverse-line` |
| 덮개 | `glass` `scrim` `photo-shade` |
| 그림자 | `shadow-float` `shadow-card` |
| 모서리 | `radius-20` `radius-30` `radius-40` `radius-pill` |
| 글꼴 | `--font-ko`(Pretendard) `--font-en`(Outfit) |

사이트에만 있는 변수: `--gradient`·`--gradient-up`·`--sky-fade`(토큰으로 만든 그라데이션), `--logo-light`·`--logo-dark`(테마에 맞는 로고만 보이게), `--t-*`(글자 크기 clamp), `--space-*`, `--gutter`, `--wrap`, `--header-h`.

## 테마

- 시스템 설정(`prefers-color-scheme`)을 따릅니다. `<html data-theme="light|dark">`가 있으면 그것이 이깁니다(어드민 미리보기의 라이트/다크 단추가 씁니다).
- 색은 토큰으로만 씁니다. 구성 요소 규칙 안에서 테마별 색을 따로 쓰지 않습니다.
- 문의 구역(`inverse`)과 사진 위 글자는 테마와 상관없이 같습니다.
- 한 가지 색 아이콘(반짝이, 버튼 화살표)은 CSS mask로 그려 토큰 색을 따릅니다. 로고는 `logo.svg`/`logo-white.svg` 두 벌을 `.logo-light`/`.logo-dark`로 바꿔 보여 줍니다.

## 글꼴 라이선스

- Pretendard: 길형진, SIL Open Font License 1.1(예약 글꼴명 Pretendard). 공식 배포본의 분할 파일(`assets/fonts/pretendard/`)을 수정 없이 사용. 라이선스 전문은 `assets/fonts/pretendard/LICENSE.txt`.
- Outfit: The Outfit Project Authors, SIL Open Font License 1.1(`assets/fonts/outfit/OFL.txt`). Google Fonts의 라틴·라틴 확장 가변 파일을 직접 호스팅.
- 외부 글꼴 서비스를 쓰지 않고 `_headers`로 1년 캐시합니다.
