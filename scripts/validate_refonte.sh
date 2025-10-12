#!/usr/bin/env bash
set -euo pipefail

# Fail si des occurrences interdites (ancienne logique Canva push / auto-pub) subsistent dans le code (hors node_modules et docs)
echo "[validate] scanning repository…"
matches=$(git grep -nE "(push.*canva|auto.?publish)" -- ':!node_modules' ':!docs' ':!*.md' ':!.github/workflows/*.yml' || true)
if [[ -n "${matches}" ]]; then
  found=0
  while IFS= read -r line; do
    [[ -z "${line}" ]] && continue
    if [[ "${line}" == scripts/validate_refonte.sh:* ]]; then
      continue
    fi
    if [[ "${line}" == *"scripts/codex/refonte-codemod.js"* ]]; then
      continue
    fi
    if [[ "${line}" == *"push_canva_disabled"* ]]; then
      continue
    fi
    if [[ "${line}" == *"auto_social_publish_disabled"* ]]; then
      continue
    fi
    echo "${line}"
    found=1
  done <<< "${matches}"
  if [[ ${found} -eq 1 ]]; then
    echo "::error::Des références push/publish subsistent. La V1 est PULL uniquement (Canva + ZIP)."
    exit 1
  fi
fi
echo "[validate] OK"
