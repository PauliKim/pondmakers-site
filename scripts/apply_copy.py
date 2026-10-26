"""고정 문구를 페이지에 써 넣고, 영어·일본어 페이지를 만든다.

- 한국어: data/copy.json    → index.html (이 파일이 세 언어 페이지의 틀이다)
- 영어:   data/copy.en.json → en/index.html
- 일본어: data/copy.ja.json → ja/index.html

어드민(/admin)에서 저장하면 서버(functions/api/copy.js)가 그 언어의 copy 파일과 페이지에 같은 일을 해서 함께 커밋한다.
SEO 설정(data/seo.json)은 세 페이지의 <!-- seo:start --> ~ <!-- seo:end --> 사이에 똑같이 들어간다(어드민 SEO 설정은 functions/api/seo.js).
copy 파일이나 index.html을 손으로 고쳤을 때 실행한다:  python3 scripts/apply_copy.py
--check 를 붙이면 바꾸지 않고, 맞지 않는 곳이 있으면 실패로 끝난다(tests에서 쓴다).
en/index.html, ja/index.html은 만들어지는 파일이라 직접 고치지 않는다. 화면 구조는 index.html에서 고친다.

index.html 쪽 약속
- 글자 요소: <태그 ... data-copy="C-01">문구</태그>  (안에는 글자와 <br>만)
- meta 요소: <meta ... data-copy="A-02" content="문구">
- 속성 문구: data-copy-ph(placeholder), data-copy-aria(aria-label), data-copy-alt(alt). data- 속성이 그 속성보다 앞에 온다.
- 줄바꿈(\\n)은 <br>로 쓴다(속성에는 띄어쓰기로).
- 언어 전환 링크: <a data-lang-link="en" href="..."> — 언어별 페이지에서 알맞은 주소로 바뀐다.
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANGS = {"ko": "ko_KR", "en": "en_US", "ja": "ja_JP"}
SITE = "https://www.pondmakers.com/"
ELEMENT = re.compile(r'(<(\w+)\b[^>]*\bdata-copy="([A-Z]-\d+)"[^>]*>)((?:[^<]|<br>)*)(</\2>)')
META = re.compile(r'(<meta\b[^>]*\bdata-copy="([A-Z]-\d+)"[^>]*\bcontent=")([^"]*)(")')
ATTRS = {"ph": "placeholder", "aria": "aria-label", "alt": "alt"}
ATTR = {k: re.compile(r'(<\w+\b[^>]*\bdata-copy-' + k + r'="([A-Z]-\d+)"[^>]*\b' + a + r'=")([^"]*)(")') for k, a in ATTRS.items()}
TAGGED = re.compile(r'data-copy(?:-ph|-aria|-alt)?="([A-Z]-\d+)"')
# 언어 폴더(en/, ja/)에서 한 단계 위를 가리키도록 바꿀 상대 주소. #, 스킴(https: mailto: data: …), /로 시작하는 것과 ./ 는 그대로
REL_ATTR = re.compile(r'(\s(?:src|href)=")(?!#|[a-zA-Z][a-zA-Z0-9+.-]*:|/|\./")([^"]*")')
REL_URL = re.compile(r'url\((?![\'"]?(?:[a-zA-Z][a-zA-Z0-9+.-]*:|/|#))([\'"]?)')
SEO_BLOCK = re.compile(r"<!-- seo:start.*?<!-- seo:end -->", re.S)
SEO_VERIFY = [("google", "google-site-verification"), ("naver", "naver-site-verification"), ("bing", "msvalidate.01")]
LANG_LINK = re.compile(r'(<a\b[^>]*\bdata-lang-link="(\w+)"[^>]*\bhref=")([^"]*)(")')


def to_html(text):
    return "<br>".join(html.escape(line, quote=True) for line in text.split("\n"))


def apply(page, items):
    """페이지 문자열에 문구를 넣고, (새 문자열, 쓰인 번호 집합)을 돌려준다."""
    used = set()

    def element(m):
        key = m.group(3)
        if key not in items:
            return m.group(0)
        used.add(key)
        return m.group(1) + to_html(items[key]) + m.group(5)

    def attr(m):
        key = m.group(2)
        if key not in items:
            return m.group(0)
        used.add(key)
        return m.group(1) + html.escape(items[key].replace("\n", " "), quote=True) + m.group(4)

    page = ELEMENT.sub(element, page)
    page = META.sub(attr, page)
    for rx in ATTR.values():
        page = rx.sub(attr, page)
    return page, used


def seo_block(seo):
    """data/seo.json → <head>에 넣을 덩어리. functions/_lib/seo.js의 seoBlock과 같은 결과"""
    image = SITE + seo["ogImage"]
    esc = lambda v: html.escape(str(v), quote=True)
    lines = [
        "<!-- seo:start 자동 생성: data/seo.json(어드민 SEO 설정). 직접 고치지 않는다 -->",
        f'<meta property="og:image" content="{esc(image)}">',
        f'<meta property="og:image:width" content="{seo["ogImageWidth"]}">',
        f'<meta property="og:image:height" content="{seo["ogImageHeight"]}">',
        f'<meta name="twitter:image" content="{esc(image)}">',
    ]
    if seo.get("index") is False:
        lines.append('<meta name="robots" content="noindex, nofollow">')
    for key, name in SEO_VERIFY:
        if seo["verification"].get(key):
            lines.append(f'<meta name="{name}" content="{esc(seo["verification"][key])}">')
    org = seo["organization"]
    data = {"@context": "https://schema.org", "@type": "Organization", "name": org["name"]}
    if org.get("alternateName"):
        data["alternateName"] = org["alternateName"]
    data["url"] = SITE
    data["logo"] = SITE + "assets/logo/logo-512.png"
    if org.get("sameAs"):
        data["sameAs"] = org["sameAs"]
    ld = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    lines += [f'<script type="application/ld+json">{ld}</script>', "<!-- seo:end -->"]
    return "\n".join(lines)


def apply_seo(page, seo):
    if not SEO_BLOCK.search(page):
        sys.exit("index.html에 <!-- seo:start --> ~ <!-- seo:end --> 자리가 없습니다.")
    block = seo_block(seo)
    return SEO_BLOCK.sub(lambda m: block, page, count=1)


def load_seo():
    return json.loads((ROOT / "data" / "seo.json").read_text())


def lang_href(page_lang, target):
    """page_lang 페이지에서 target 언어 첫 화면으로 가는 상대 주소"""
    if page_lang == target:
        return "./"
    if page_lang == "ko":
        return f"{target}/"
    return "../" if target == "ko" else f"../{target}/"


def localize(page, lang):
    """한국어 틀(index.html)을 lang 폴더에 둘 페이지로 바꾼다(문구는 apply로 따로 넣는다)."""
    if lang == "ko":
        return page
    page = page.replace('<html lang="ko" data-lang="ko" data-root="">', f'<html lang="{lang}" data-lang="{lang}" data-root="../">', 1)
    page = page.replace("<!doctype html>\n", f"<!doctype html>\n<!-- 자동 생성 파일: index.html과 data/copy.{lang}.json으로 scripts/apply_copy.py가 만든다. 직접 고치지 않는다. -->\n", 1)
    page = page.replace(f'<link rel="canonical" href="{SITE}">', f'<link rel="canonical" href="{SITE}{lang}/">', 1)
    page = page.replace('<meta property="og:locale" content="ko_KR">', f'<meta property="og:locale" content="{LANGS[lang]}">', 1)
    page = REL_ATTR.sub(lambda m: m.group(1) + "../" + m.group(2), page)
    page = REL_URL.sub(lambda m: "url(" + m.group(1) + "../", page)
    return LANG_LINK.sub(lambda m: m.group(1) + lang_href(lang, m.group(2)) + m.group(4), page)


def load_items(lang):
    name = "copy.json" if lang == "ko" else f"copy.{lang}.json"
    return json.loads((ROOT / "data" / name).read_text())["items"]


def page_path(lang):
    return ROOT / ("index.html" if lang == "ko" else f"{lang}/index.html")


def build(template, lang):
    """(그 언어 페이지 문자열, 쓰인 번호 집합)"""
    return apply(localize(template, lang), load_items(lang))


def main():
    check = "--check" in sys.argv
    template = apply_seo(page_path("ko").read_text(), load_seo())
    tagged = set(TAGGED.findall(template))
    problems, changed = [], []
    for lang in LANGS:
        after, used = build(template, lang)
        missing = sorted(tagged - used)
        if missing:
            problems.append(f"{lang}: 문구를 넣지 못한 번호 {', '.join(missing)} (copy 파일에 없거나 요소 안에 다른 태그가 있음)")
            continue
        path = page_path(lang)
        before = path.read_text() if path.exists() else ""
        if lang == "ko":
            template = after  # 한국어 문구를 넣은 틀로 다른 언어를 만든다(결과는 같지만 비교가 쉬워진다)
        if after != before:
            changed.append(path.relative_to(ROOT).as_posix())
            if not check:
                path.parent.mkdir(exist_ok=True)
                path.write_text(after)
    if problems:
        sys.exit("\n".join(problems))
    if check:
        if changed:
            sys.exit(f"페이지가 copy 파일과 다릅니다: {', '.join(changed)}. python3 scripts/apply_copy.py 를 실행하세요.")
        print(f"문구 일치: {len(tagged)}개 번호 × {len(LANGS)}개 언어")
        return
    print(f"반영했습니다: {', '.join(changed)}" if changed else "바뀐 문구가 없습니다.")


if __name__ == "__main__":
    main()
