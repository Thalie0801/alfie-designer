#!/usr/bin/env bash
set -euo pipefail

fix_file() {
  local f="$1"
  [[ "$f" =~ node_modules|\.next|dist|build|\.output ]] && return 0
  [[ ! "$f" =~ \.(ts|tsx|js|jsx|json|md|yaml|yml|sh)$ ]] && return 0
  sed -i 's/\r$//' "$f"
  LC_ALL=C tr -d '\000\001\002\003\004\005\006\007\010\013\014\016-\037' < "$f" > "$f.__clean__" || true
  if ! cmp -s "$f" "$f.__clean__"; then
    mv "$f.__clean__" "$f"
    echo "cleaned: $f"
  else
    rm -f "$f.__clean__"
  fi
}

export -f fix_file
git ls-files | xargs -I{} bash -lc 'fix_file "$@"' _ {}
