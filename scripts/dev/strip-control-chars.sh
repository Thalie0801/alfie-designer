#!/usr/bin/env bash
set -euo pipefail

# contrôle: on supprime tout caractère de contrôle ASCII < 0x20
# sauf TAB (0x09), LF (0x0A) et CR (0x0D)
# + conversion CRLF -> LF

fix_file() {
  local f="$1"
  # skip dossiers node_modules/.next/.output/dist…
  [[ "$f" =~ node_modules|\.next|dist|build|\.output ]] && return 0
  # uniquement code
  [[ ! "$f" =~ \.(ts|tsx|js|jsx|json|md|yaml|yml|sh)$ ]] && return 0
  # convertit CRLF -> LF
  sed -i 's/\r$//' "$f"
  # supprime les chars de contrôle indésirables
  LC_ALL=C tr -d '\000\001\002\003\004\005\006\007\010\013\014\016\017\020\021\022\023\024\025\026\027\030\031\032\033\034\035\036\037' < "$f" > "$f.__clean__" || true
  if ! cmp -s "$f" "$f.__clean__"; then
    mv "$f.__clean__" "$f"
    echo "cleaned: $f"
  else
    rm -f "$f.__clean__"
  fi
}

export -f fix_file
while IFS= read -r file; do
  fix_file "$file"
done < <(git ls-files)
