# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/b6ceafb7-5b2f-483f-b988-77dd6e3f8f0e

## How can I edit this code?

There are several ways of editing your application.

## Install & CI

> **TL;DR** – rely on GitHub Actions for deterministic installs. Vercel builds no longer install `jscodeshift`; codemods run only in local environments or dedicated CI jobs.

The repository keeps the default public npm registry (`.npmrc` enforces `https://registry.npmjs.org/`). Our `Node CI` workflow on GitHub Actions pings the registry, runs `npm ci`, `npm run build --if-present`, and `npm test --if-present`. If your editing environment cannot reach the npm registry (common on restricted corporate networks or egress-blocked sandboxes), trigger the CI pipeline instead of attempting a local install—the workflow is the source of truth for dependency resolution and build status.

### Codemods hors Vercel

- Les déploiements Vercel n'installent plus `jscodeshift`.
- Pour lancer les codemods, exécutez `npx --yes jscodeshift@0.15.2` (ou `make codex`, qui utilise cette commande) depuis votre machine locale ou un job CI dédié.
- Pensez à nettoyer votre lockfile après coup : la commande `npx` ne modifie pas `package.json`, ce qui évite toute divergence avec la branche principale.

### Install standard (npm registry public)

1. Poussez vos changements ou ouvrez une pull request.
2. Laissez tourner le workflow `Node CI` ; il vérifie l'accès au registre (`npm ping`) avant d'exécuter `npm ci`.
3. Si le workflow échoue avec une erreur réseau, vérifiez votre connectivité ou relancez l'installation via GitHub Actions.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/b6ceafb7-5b2f-483f-b988-77dd6e3f8f0e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

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

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/b6ceafb7-5b2f-483f-b988-77dd6e3f8f0e) and click on Share -> Publish.

### Déploiement sur Vercel

Si vous déployez manuellement le projet sur Vercel, pensez à renseigner les variables d'environnement suivantes dans **Project Settings → Environment Variables** avant de cliquer sur « Open App » :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `NPM_CONFIG_FETCH_RETRIES` (ex. `5`)
- `NPM_CONFIG_FETCH_RETRY_FACTOR` (ex. `2`)
- `NPM_CONFIG_FETCH_RETRY_MINTIMEOUT` (ex. `1000`)
- `NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT` (ex. `60000`)

Ces valeurs garantissent que Vercel dispose des accès Supabase **et** qu'il réessaie proprement les téléchargements npm en cas de micro-coupure réseau (évite l'erreur « tarball… seems to be corrupted »). N'oubliez pas également d'ajuster la commande **Install Command** dans *Project Settings → Build & Development Settings* vers :

```sh
npm ci --prefer-offline=false --no-audit --loglevel=info
```

Sans ces paramètres, l'application plante au chargement et Vercel affiche une erreur lors de l'ouverture du déploiement.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Debugging the video job hotfix locally

While the database migration from UUID to text identifiers is in progress, the app writes
`job_id: null` for new video generations. If you need to verify that your local environment is
clean and can still build successfully, run the quick checks below:

```sh
# Ensure no merge-conflict markers remain in the tracked files
git grep -n '<<<<<<<\|=======\|>>>>>>>' -- . ':!package-lock.json'

# Install dependencies from package-lock for a deterministic build
npm ci

# Reproduce the Lovable build to catch any runtime or type errors
npm run build
```

The build should complete without reporting TypeScript or runtime errors. If you do see the
database still forcing UUID casts, keep the hotfix in place until the schema migration is fully
rolled out (all `job_id` columns converted to `TEXT` and no triggers re-casting values).

## Dépendances privées et CI

Ce dépôt ne référence actuellement que des paquets publics sur le registre npm officiel. L'analyse automatique (`scripts/check-private.js`) échoue localement si le `package-lock.json` contient des URLs pointant vers un registre privé. Cette vérification est également exécutée dans la CI GitHub Actions.

### Cas 100 % public

Aucun jeton n'est nécessaire : le fichier `.npmrc` force l'utilisation du registre public (`https://registry.npmjs.org/`) sans authentification obligatoire. Si la CI détecte néanmoins des URLs privées résiduelles, supprimez le lockfile (`rm package-lock.json`) puis régénérez-le (`npm install`).

### Cas avec paquets privés npmjs.com

1. Créez un jeton d'accès sur https://www.npmjs.com/settings/mon-compte/tokens (type "Automation").
2. Ajoutez le secret `NPM_TOKEN` dans les secrets du dépôt GitHub (`Settings > Secrets and variables > Actions`).
3. Relancez la CI : le workflow `Node CI` utilisera automatiquement ce jeton pendant `npm ci`.

### Cas avec paquets GitHub Packages

1. Générez un Personal Access Token avec la permission `read:packages`.
2. Ajoutez-le dans les secrets GitHub sous le nom `READ_PACKAGES_TOKEN`.
3. La CI utilisera ce jeton si des URLs GitHub Packages sont détectées. Pensez à conserver les dépendances publiques lorsqu'elles n'ont pas besoin de ce registre.

### Aide locale

Avant chaque installation, le script `preinstall` exécute `node scripts/check-private.js --strict`. Si des dépendances privées sont détectées, l'installation est interrompue avec un message expliquant comment corriger la configuration.
