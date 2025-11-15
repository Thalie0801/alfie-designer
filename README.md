# Alfie Designer – Supabase Edition

Ce dépôt est désormais préparé pour une exécution autonome avec Supabase (base de données + Auth) et Vercel. Les outils de migration permettent de quitter Lovable Cloud sans perte de données.

## Démarrage rapide

```sh
# 1. Installer les dépendances
npm install

# 2. Renseigner les variables d'environnement dans .env.supabase
#    (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, etc.)

# 3. Lancer l'application
npm run dev
```

Les scripts de migration se trouvent à la racine :

- `migrate_to_supabase.js` : orchestre l'export Lovable, l'import Supabase, la configuration Auth et la validation.
- `docs/MIGRATION_SUPABASE.md` : guide détaillé étape par étape.

Pour lancer une migration complète :

```sh
node migrate_to_supabase.js
```

Pour des exécutions ciblées :
### Troubleshooting dependency installs

If the npm registry returns `403` errors or the install stops with `ENOTEMPTY`/`EBUSY` issues, make sure the root `.npmrc` is
present and points to the public registry. The file in this repository already contains sane defaults:

```ini
registry=https://registry.npmjs.org/
always-auth=true
fund=false
audit=false
# proxy=http://user:pass@proxy.company:8080
# https-proxy=http://user:pass@proxy.company:8080
```

When the cache is corrupted locally, clean up the workspace and reinstall using exact versions locked in `package-lock.json`:

```sh
git clean -xfd -e .env -e .env.local
npm cache verify || true
npm cache clean --force || true
npm ci --prefer-online
```

If your organisation requires an npm auth token in CI, expose it as `NPM_TOKEN` and append it to `~/.npmrc` before running
`npm ci`:

```sh
echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> ~/.npmrc
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

```sh
node migrate_to_supabase.js --step=schema
node migrate_to_supabase.js --step=data
node migrate_to_supabase.js --step=config
node migrate_to_supabase.js --step=validate
```

Les exports JSON sont stockés dans `data_export/`, les artefacts de schéma dans `migration_artifacts/` et les journaux dans `migration_logs/`.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Refonte V1 runbook (PULL only)

The refonte branch ships a locked-down delivery flow: Canva link + ZIP, no autopublish, quotas unchanged, and 30-day retention.

- `make codex` runs the codemod that rewrites any lingering push/publish flows to the PULL delivery endpoint while skipping the landing page guardrails.
- `make validate` calls `scripts/validate_refonte.sh` to ensure no "push Canva" or autopublish traces slip through the diff.
- `make cleanup` triggers the 30-day retention cleanup script used in production cronjobs.
- `make test` executes the codemod Jest suite (uses `npm test --scripts-prepend-node-path`).

For backend integrations, see [`examples/api/express/counters.ts`](examples/api/express/counters.ts) for the `/v1/counters` handler that returns usage totals and 80% alerts, and consult the refonte docs in [`docs/REFONTE-2025`](docs/REFONTE-2025) for acceptance checklists.

## Déploiement

Si vous déployez manuellement le projet sur Vercel, pensez à renseigner les variables d'environnement suivantes dans **Project Settings → Environment Variables** avant de cliquer sur « Open App » :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Ces valeurs sont utilisées pour initialiser le client Supabase côté front-end. Sans elles, l'application plante au chargement et Vercel affiche une erreur lors de l'ouverture du déploiement.

## Puis-je connecter un domaine personnalisé ?
## Variables d'environnement (accès VIP/Admin)

- `VIP_EMAILS` : liste d'adresses e-mail (séparées par des virgules, insensibles à la casse) autorisées à accéder au dashboard même sans abonnement actif.
- `ADMIN_EMAILS` : mêmes règles, mais octroie l'accès administrateur complet.

> ⚠️ Ne stockez pas d'e-mails réels dans le dépôt Git. Renseignez ces valeurs uniquement dans vos fichiers `.env.local` ou via la configuration de votre hébergeur.

## Flux d'authentification & facturation

1. **Inscription** : la page `/auth` vérifie qu'une session Stripe (`verify-payment`) a été validée avant d'autoriser la création de compte.
2. **Connexion** : `useAuth.signIn` autorise immédiatement les e-mails listés dans `VIP_EMAILS` ou `ADMIN_EMAILS`. Les autres utilisateurs doivent disposer d'un plan actif (`starter`, `pro`, `studio`, `enterprise`) ou d'un accès `granted_by_admin`.
3. **Blocage des comptes gratuits** : si aucun abonnement actif n'est détecté, la connexion est refusée et l'utilisateur est redirigé vers `/pricing?reason=no-sub`.
4. **Protection UI** : `AccessGuard` n'affiche « Connexion requise » que pour les visiteurs non authentifiés, éliminant les faux positifs sur `/dashboard`.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Oui : configurez-le directement dans Vercel (`Project → Settings → Domains`). Consultez la [documentation Vercel](https://vercel.com/docs/projects/domains/add-a-domain) pour plus de détails.

## Debugging the video job hotfix locally

While the database migration from UUID to text identifiers is in progress, the app writes
`job_id: null` for new video generations. If you need to verify that your local environment is
clean and can still build successfully, run the quick checks below:

```sh
# Ensure no merge-conflict markers remain in the tracked files
git grep -n '<<<<<<<\|=======\|>>>>>>>' -- . ':!package-lock.json'

# Install dependencies from package-lock for a deterministic build
npm ci

# Reproduce the production build to catch any runtime or type errors
npm run build
```

The build should complete without reporting TypeScript or runtime errors. If you do see the
database still forcing UUID casts, keep the hotfix in place until the schema migration is fully
rolled out (all `job_id` columns converted to `TEXT` and no triggers re-casting values).
