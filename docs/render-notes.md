# Render.com – configuration recommandée

Build Command:
pnpm install --frozen-lockfile && pnpm run build

Start Command:
pnpm run preview

Environment:
NODE_VERSION = 20.15.1
PNPM_VERSION = 9.15.3

Remarque : si le lockfile est corrompu sur Render, supprimer `pnpm-lock.yaml` puis relancer `pnpm install` en local et pousser le nouveau lockfile.
