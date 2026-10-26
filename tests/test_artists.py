"""아티스트 캐러셀 점검(네트워크 없음): python3 tests/test_artists.py

functions/_lib/artists.js의 순수 함수를 맥에 기본으로 있는 osascript(JavaScript)로 실행해 본다.
- limit은 1~100 정수로, 숨긴 수만큼 더 받아도 100을 넘지 않는지
- 숨긴 아티스트·같은 id 반복·이름 없음·https 아닌 그림은 빼는지
- 팔로우 많은 순(같으면 받은 순서)이고 limit명에서 자르는지
- 숨김 파일(data/artists-hidden.json) 읽기
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ok = []


def check(name, cond, detail=""):
    if not cond:
        sys.exit(f"실패: {name} {detail}")
    ok.append(name)


hidden_doc = json.loads((ROOT / "data/artists-hidden.json").read_text())
check("숨김 파일 형식", isinstance(hidden_doc.get("hidden"), list))

if not shutil.which("osascript"):
    print("(osascript가 없어 건너뜀)")
    sys.exit(0)

lib = re.sub(r"^export ", "", (ROOT / "functions/_lib/artists.js").read_text(), flags=re.M)


def js(expr):
    r = subprocess.run(["osascript", "-l", "JavaScript", "-e", lib + f"\nJSON.stringify({expr});"], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"실패: JavaScript 실행 {r.stderr}")
    return json.loads(r.stdout)


for given, want in [("'20'", 20), ("'0'", 1), ("'-5'", 1), ("'250'", 100), ("'abc'", 20), ("null", 20), ("'7.9'", 7)]:
    check(f"limit {given}", js(f"clampLimit({given})") == want)
check("숨긴 수만큼 더 받기", js("upstreamLimit(20, 3)") == 23)
check("더 받아도 100까지", js("upstreamLimit(99, 5)") == 100)

data = {
    "generatedAt": "2026-10-26T09:00:00Z",
    "artists": [
        {"id": "AT1", "nameEn": "Low", "imageUrl": "https://cdn.example.com/1.webp", "followerCount": 10},
        {"id": "AT2", "nameEn": "Top", "imageUrl": "https://cdn.example.com/2.webp", "followerCount": 900},
        {"id": "AT3", "nameEn": "Hidden", "imageUrl": "https://cdn.example.com/3.webp", "followerCount": 800},
        {"id": "AT4", "nameEn": "  ", "imageUrl": "https://cdn.example.com/4.webp", "followerCount": 700},
        {"id": "AT5", "nameEn": "Http", "imageUrl": "http://cdn.example.com/5.webp", "followerCount": 600},
        {"id": "AT6", "nameEn": "Tie A", "imageUrl": "https://cdn.example.com/6.webp", "followerCount": 50},
        {"id": "AT7", "nameEn": "Tie B", "imageUrl": "https://cdn.example.com/7.webp", "followerCount": 50},
        {"id": "AT2", "nameEn": "Dup", "imageUrl": "https://cdn.example.com/2b.webp", "followerCount": 1000},
        {"id": None, "nameEn": "NoId", "imageUrl": "https://cdn.example.com/x.webp", "followerCount": 5},
        {"id": "AT8", "nameEn": "Inject\"", "imageUrl": "https://cdn.example.com/8.webp\" onerror=\"x", "followerCount": 4},
    ],
}
got = js(f"pickArtists({json.dumps(data)}, ['AT3'], 10)")
names = [a["nameEn"] for a in got["artists"]]
check("기준 시각 그대로", got["generatedAt"] == data["generatedAt"])
check("거르고 팔로우 순", names == ["Top", "Tie A", "Tie B", "Low"], f"{names}")
check("숨김 제외", "Hidden" not in names)
check("같은 id는 처음 것만", [a["id"] for a in got["artists"]].count("AT2") == 1 and got["artists"][0]["imageUrl"].endswith("/2.webp"))
check("limit에서 자름", [a["nameEn"] for a in js(f"pickArtists({json.dumps(data)}, [], 2)")["artists"]] == ["Top", "Hidden"])
check("빈 응답", js("pickArtists(null, [], 5)") == {"generatedAt": None, "artists": []})
check("숨김 파일 읽기", js("hiddenIdsOf({hidden: [{id: 'AT1', name: 'A'}, 'AT2', {id: 3}]})") == ["AT1", "AT2", "3"])

print("통과: " + ", ".join(ok[:6]) + f" 외 {len(ok) - 6}개")
