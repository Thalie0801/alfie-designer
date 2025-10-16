#!/usr/bin/env bash
set -euo pipefail

# Refonte V1 — Runner Codex (désactivé)
#
# Le codemod basé sur jscodeshift a été retiré du dépôt car la dépendance
# provoquait des erreurs 403 lors des installations npm (notamment sur Vercel).
# Ce script est conservé pour référence mais ne lance plus jscodeshift.

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
cd "$ROOT"

cat <<'MSG'
[codex] Le codemod jscodeshift a été désactivé.
[codex] Pour exécuter une migration locale, installez jscodeshift manuellement :
[codex]   npm install --global jscodeshift
[codex] puis adaptez le script selon vos besoins.
MSG

