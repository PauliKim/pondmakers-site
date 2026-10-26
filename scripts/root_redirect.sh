#!/bin/zsh
# pondmakers.com(루트) → https://www.pondmakers.com 301 넘기기를 카페24 호스팅(pondmakers26) 웹 루트 .htaccess 맨 위에 넣는다.
# 카페24 호스팅에는 웹 파일 관리자가 없어 FTP로 고친다. 비밀번호는 실행한 사람이 직접 입력하고, 어디에도 저장하지 않는다.
#   zsh scripts/root_redirect.sh          넣기(이미 있으면 아무것도 안 함)
#   zsh scripts/root_redirect.sh --undo   백업해 둔 원래 .htaccess로 되돌리기
# 원래 파일은 ~/Desktop/pondmakers-htaccess-backup/ 에 남긴다.
set -eu
HOST="pondmakers.com"; USER_ID="pondmakers26"
BACKUP=~/Desktop/pondmakers-htaccess-backup
mkdir -p "$BACKUP"

CFG=$(mktemp); chmod 600 "$CFG"; trap 'rm -f "$CFG"' EXIT
ftp() { curl -sS --ssl --ftp-pasv -K "$CFG" "$@"; }

# 비밀번호가 틀리면 3번까지 다시 묻는다. 비밀번호는 프로세스 목록에 보이지 않게 curl 설정 파일로 넘긴다
for try in 1 2 3; do
  read -rs "PW?카페24 FTP 비밀번호($USER_ID) 입력 후 Enter (글자는 보이지 않습니다): "; echo
  ESC=${PW//\\/\\\\}; ESC=${ESC//\"/\\\"}
  print -r -- "user = \"$USER_ID:$ESC\"" > "$CFG"
  unset PW ESC
  echo "FTP 접속 확인…"
  if LIST=$(ftp --list-only "ftp://$HOST/" 2>&1); then break; fi
  echo "접속 실패: $LIST"
  [[ $try == 3 ]] && { echo "3번 실패해서 멈춥니다. 카페24 호스팅 → FTP 비밀번호 변경에서 비밀번호를 확인해 주세요."; exit 1; }
  echo "비밀번호가 틀린 것 같습니다. 다시 입력해 주세요."
done
# 웹 루트: FTP 홈에 바로 index.php가 있으면 홈, 아니면 www 폴더(카페24 계정마다 다르다)
if print -r -- "$LIST" | grep -qx "index.php"; then WEB=""
elif print -r -- "$LIST" | grep -qx "www"; then WEB="www/"
else echo "웹 루트를 찾지 못했습니다(index.php, www 둘 다 없음). 멈춥니다."; exit 1; fi
echo "웹 루트: /${WEB}"

if [[ "${1:-}" == "--undo" ]]; then
  [[ -f "$BACKUP/htaccess.orig" ]] || { echo "백업 파일이 없습니다."; exit 1; }
  ftp -T "$BACKUP/htaccess.orig" "ftp://$HOST/${WEB}.htaccess"
  echo "원래 .htaccess로 되돌렸습니다."; exit 0
fi

ORIG="$BACKUP/htaccess.orig"
if ftp "ftp://$HOST/${WEB}.htaccess" -o "$ORIG.tmp" 2>/dev/null; then mv "$ORIG.tmp" "$ORIG"; else rm -f "$ORIG.tmp"; : > "$ORIG"; echo "(원래 .htaccess가 없었습니다)"; fi
if grep -q 'www\.pondmakers\.com' "$ORIG"; then echo "이미 넘기기 규칙이 있습니다. 바꾸지 않습니다."; exit 0; fi

NEW="$BACKUP/htaccess.new"
{
  print -r -- '# 새 사이트(www.pondmakers.com, Cloudflare Pages)로 넘기기. 2026-10-26 추가'
  print -r -- 'RewriteEngine On'
  print -r -- 'RewriteCond %{HTTP_HOST} ^pondmakers\.com$ [NC]'
  print -r -- 'RewriteRule ^(.*)$ https://www.pondmakers.com/$1 [R=301,L]'
  print -r -- ''
  cat "$ORIG"
} > "$NEW"
ftp -T "$NEW" "ftp://$HOST/${WEB}.htaccess"
echo "넣었습니다. 원래 파일: $ORIG"
