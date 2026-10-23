"""고정 문구·다국어 점검(네트워크 없음): python3 tests/test_copy.py

- 세 언어 copy 파일(copy.json, copy.en.json, copy.ja.json)의 번호가 data/copy-schema.json과 같은지
- index.html, en/index.html, ja/index.html이 copy 파일과 같은지(scripts/apply_copy.py --check)
- index.html·app.js에 쓰인 번호가 모두 목록에 있고, 목록의 번호가 모두 화면 어딘가에 쓰이는지
- 문구 안의 자리표시({n} 등)가 목록에 정의된 것인지
- 줄바꿈·따옴표·태그가 HTML에 안전하게 들어가는지(글자·meta·placeholder·aria-label·alt)
- en/, ja/ 페이지의 상대 주소와 언어 전환 링크
- data/news.json의 그림 파일이 있는지
- (macOS) 서버의 applyCopy(functions/_lib/copy.js)가 파이썬과 같은 결과인지, 나라별 이동 규칙(functions/_lib/lang.js)
"""
import importlib.util
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("apply_copy", ROOT / "scripts/apply_copy.py")
ac = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ac)

schema = json.loads((ROOT / "data/copy-schema.json").read_text())
defs = {i["id"]: i for g in schema["groups"] for i in g["items"]}
copies = {lang: ac.load_items(lang) for lang in ac.LANGS}
page = (ROOT / "index.html").read_text()
script = (ROOT / "app.js").read_text()
ok = []


def check(name, cond, detail=""):
    if not cond:
        sys.exit(f"실패: {name} {detail}")
    ok.append(name)


for lang, items in copies.items():
    check(f"{lang} 번호 일치", set(defs) == set(items), f"{sorted(set(defs) ^ set(items))}")
    check(f"{lang} 빈 문구 없음", all(v.strip() for v in items.values()), f"{[k for k, v in items.items() if not v.strip()]}")
    for k, v in items.items():
        for name in re.findall(r"\{(\w+)\}", v):
            check(f"{lang} {k} 자리표시", name in (defs[k].get("vars") or {}), f"{{{name}}}")
    for k, d in defs.items():
        for name in d.get("vars") or {}:
            check(f"{lang} {k} 자리표시 빠짐 없음", f"{{{name}}}" in items[k], f"{{{name}}}")

r = subprocess.run([sys.executable, str(ROOT / "scripts/apply_copy.py"), "--check"], capture_output=True, text=True)
check("세 언어 페이지가 copy 파일과 같음", r.returncode == 0, r.stdout + r.stderr)

used = set(ac.TAGGED.findall(page)) | set(re.findall(r'data-copy-dyn="([A-Z]-\d+)"', page))
used |= set(re.findall(r'"([A-Z]-\d{2})"', script))
check("화면의 번호가 목록에 있음", used <= set(defs), f"{sorted(used - set(defs))}")
check("목록의 번호가 화면에 쓰임", set(defs) <= used, f"{sorted(set(defs) - used)}")

sample = {"C-02": '첫 줄\n"따옴표" <b>태그</b> & \'작은\'', "A-02": "설명\n줄", "H-14": '이름 "칸"', "K-07": "<이전>", "K-09": 'a"b'}
out, _ = ac.apply(page, sample)
check("줄바꿈과 이스케이프", '첫 줄<br>&quot;따옴표&quot; &lt;b&gt;태그&lt;/b&gt; &amp; &#x27;작은&#x27;' in out)
check("meta 줄바꿈은 띄어쓰기로", 'data-copy="A-02" content="설명 줄"' in out)
check("입력칸 안내 이스케이프", 'data-copy-ph="H-14" placeholder="이름 &quot;칸&quot;"' in out)
check("aria-label 이스케이프", 'data-copy-aria="K-07" aria-label="&lt;이전&gt;"' in out)
check("alt 이스케이프", 'data-copy-alt="K-09" alt="a&quot;b"' in out)

# 언어 폴더 페이지
for lang in ("en", "ja"):
    p = (ROOT / f"{lang}/index.html").read_text()
    check(f"{lang} html lang", f'<html lang="{lang}" data-lang="{lang}" data-root="../">' in p)
    check(f"{lang} canonical", f'<link rel="canonical" href="https://www.pondmakers.com/{lang}/">' in p)
    bad = [u for u in re.findall(r'\s(?:src|href)="([^"]*)"', p) if not re.match(r"#|[a-zA-Z][a-zA-Z0-9+.-]*:|/|\.\./|\./$", u)]
    check(f"{lang} 상대 주소가 모두 ../ 로", not bad, f"{bad[:5]}")
    check(f"{lang} 스타일 안 그림 주소", not re.search(r"url\((?!['\"]?(?:\.\./|data:|https?:))", p))
    links = dict(re.findall(r'data-lang-link="(\w+)" href="([^"]*)"', p))
    check(f"{lang} 언어 전환 링크", links == {"ko": "../", lang: "./", ({"en": "ja", "ja": "en"}[lang]): f"../{ {'en': 'ja', 'ja': 'en'}[lang]}/"}, f"{links}")
    check(f"{lang} 한국어가 남지 않음(주석 제외)", not re.search(r"[가-힣]", re.sub(r"<!--.*?-->|<style>.*?</style>", "", p, flags=re.S).replace('lang="ko">KO', "")), "")
check("ko 언어 전환 링크", dict(re.findall(r'data-lang-link="(\w+)" href="([^"]*)"', page)) == {"ko": "./", "en": "en/", "ja": "ja/"})

# 뉴스 목록: 그림 파일이 있고 제목이 비지 않았는지
news = json.loads((ROOT / "data/news.json").read_text())["news"]
for n in news:
    check(f"뉴스 {n.get('title')}", bool(n.get("title")) and (ROOT / n["image"]).is_file(), n.get("image", ""))

# 서버 쪽 JavaScript(맥에 기본으로 있는 osascript로 실행)
if shutil.which("osascript"):
    def js(source):
        r = subprocess.run(["osascript", "-l", "JavaScript", "-e", source], capture_output=True, text=True)
        if r.returncode != 0:
            sys.exit(f"실패: JavaScript 실행 {r.stderr}")
        return r.stdout.strip()

    def module(path):
        return re.sub(r"^export ", "", (ROOT / path).read_text(), flags=re.M).replace("import ", "// import ")

    lib = module("functions/_lib/copy.js")
    for lang in ac.LANGS:
        target = ac.localize((ROOT / "index.html").read_text(), lang)
        expected, _ = ac.apply(target, {**copies[lang], **sample})
        got = js(lib + f"\nfunction run() {{ return applyCopy({json.dumps(target)}, {json.dumps({**copies[lang], **sample})}); }} run();")
        check(f"{lang} 서버 applyCopy가 파이썬과 같음", got == expected.strip(), "")

    lang_lib = module("functions/_lib/lang.js")
    cases = [
        ({"country": "KR"}, None), ({"country": "JP"}, "/ja/"), ({"country": "US"}, "/en/"), ({"country": None}, "/en/"),
        ({"country": "US", "cookie": "a=1; lang=ko"}, None), ({"country": "KR", "cookie": "lang=ja"}, "/ja/"),
        ({"country": "US", "pathname": "/en/"}, None), ({"country": "US", "search": "?preview=1"}, None),
        ({"country": "US", "userAgent": "Mozilla/5.0 (compatible; Googlebot/2.1)"}, None), ({"country": "JP", "method": "POST"}, None),
        ({"country": "US", "search": "?utm=x"}, "/en/?utm=x"),
    ]
    for given, want in cases:
        args = {"method": "GET", "pathname": "/", "search": "", "cookie": "", "userAgent": "Mozilla/5.0", **given}
        got = js(lang_lib + f"\nJSON.stringify(redirectTarget({json.dumps(args)}));")
        check(f"나라별 이동 {given}", json.loads(got) == want, f"{got} ≠ {want}")
else:
    print("(osascript가 없어 JavaScript 점검은 건너뜀)")

print("통과: " + ", ".join(ok[:6]) + f" 외 {len(ok) - 6}개")
