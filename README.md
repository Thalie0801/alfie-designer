# Alfie Designer Platform

Alfie Designer est une plateforme SaaS construite avec Vite, React Router, TypeScript et Tailwind CSS. L’application consomme une base Supabase/Postgres via Prisma et gère la facturation avec Stripe. Le déploiement cible Vercel à l’aide d’une configuration explicite pour Vite.

## Prérequis

- Node.js >= 20
- npm >= 9
- Accès à une base de données Postgres (Supabase conseillé)
- Clés Stripe de test pour la facturation et les webhooks

## Configuration de l’environnement

1. Copiez le fichier d’exemple puis complétez les variables :
   ```bash
   cp .env.example .env
   ```
2. Renseignez les informations suivantes :
   - Connexion base de données : `DATABASE_URL`, `DIRECT_URL`
   - Supabase : `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET`, `VITE_SHOW_DEBUG`
   - Stripe : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - Webhook vidéo : `VIDEO_WEBHOOK_SECRET` (32+ caractères) et `ALLOWED_ASSET_URL_PREFIXES` (liste CSV des préfixes autorisés)
   - URL de base de l’app : `BASE_URL`

## Installation

```bash
npm install
npx prisma db push
```

### Tailwind CSS

Si les dépendances Tailwind ne sont pas encore installées localement :

```bash
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Les styles globaux résident dans `src/styles/index.css` et sont importés par `src/main.tsx`.

## Démarrage & build

- Développement : `npm run dev`
- Build production : `npm run build`
- Prévisualisation locale du build : `npm run preview`

La page d’accueil (`/`) propose un accès direct au générateur (`/generator`) ainsi qu’à l’interface complète (`/landing`).

## Déploiement Vercel (Vite)

Le fichier `vercel.json` force la détection du framework Vite :

```json
{
  "framework": "vite",
  "buildCommand": "vite build",
  "outputDirectory": "dist"
}
```

Aucune configuration supplémentaire n’est requise côté Vercel ; le SPA est servi depuis le dossier `dist`.

## Webhook vidéo sécurisé

Le webhook vidéo est exposé via la fonction serverless `api/webhooks/video.ts`. Il vérifie la signature HMAC (`x-alfie-signature`), applique un contrôle d’allowlist sur les URLs d’assets et met à jour la base via Prisma.

Pour tester le webhook localement :

1. Créez un payload dans `raw.json` :
   ```json
   {
     "jobId": "<JOB_ID>",
     "status": "succeeded",
     "url": "https://your-project.supabase.co/storage/v1/object/public/video.mp4",
     "thumbUrl": "https://your-project.supabase.co/storage/v1/object/public/video-thumb.jpg",
     "durationMs": 1234
   }
   ```
2. Générez la signature HMAC :
   ```bash
   signature=$(echo -n "$(< raw.json)" | openssl dgst -sha256 -hmac "$VIDEO_WEBHOOK_SECRET" -r | awk '{print $1}')
   ```
3. Appelez la fonction Vercel (en local avec `vercel dev` ou sur votre domaine) :
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/video \
     -H "content-type: application/json" \
     -H "x-alfie-signature: sha256=$signature" \
     --data-binary @raw.json
   ```

Le webhook renvoie `{ "success": true }` si la mise à jour est traitée ou une erreur structurée `{ "error": "..." }` dans le cas contraire.

## Supabase Edge Functions — Déploiement

Les fichiers sources des Edge Functions résident dans `supabase/functions/*`. Pour qu’une fonction apparaisse dans le dashboard Supabase et soit invocable par l’application, elle doit être déployée explicitement. Trois approches sont possibles :

### 1. Depuis le Dashboard (Editor)

1. Ouvrez votre projet Supabase puis cliquez sur **Functions → Open Editor**.
2. Créez une nouvelle fonction (ex : `alfie-generate`) et collez le contenu du fichier correspondant, par exemple `supabase/functions/alfie-generate/index.ts`.
3. Cliquez sur **Deploy**.
4. Dans le menu **Secrets**, ajoutez les variables nécessaires (`VIDEO_WEBHOOK_SECRET`, `SUPABASE_URL`, etc.).

### 2. Via la CLI Supabase (conteneur Docker)

Si la CLI n’est pas installée localement, vous pouvez l’exécuter via Docker :

```bash
# Lier le dépôt au projet Supabase
docker run --rm -it -v "$PWD":/work -w /work \
  -e SUPABASE_ACCESS_TOKEN \
  ghcr.io/supabase/cli:latest \
  supabase link --project-ref <PROJECT_REF>

# Déployer une fonction (ex. alfie-generate)
docker run --rm -it -v "$PWD":/work -w /work \
  -e SUPABASE_ACCESS_TOKEN \
  ghcr.io/supabase/cli:latest \
  supabase functions deploy alfie-generate --project-ref <PROJECT_REF>

# Déclarer les secrets nécessaires à la fonction
docker run --rm -it -v "$PWD":/work -w /work \
  -e SUPABASE_ACCESS_TOKEN \
  ghcr.io/supabase/cli:latest \
  supabase secrets set VIDEO_WEBHOOK_SECRET="xxxxx" --project-ref <PROJECT_REF>
```

### 3. Automatisation via GitHub Actions

Ajoutez un workflow qui, à chaque push sur la branche principale, exécute les commandes ci-dessus (`supabase link` + `supabase functions deploy`). Veillez à stocker `SUPABASE_ACCESS_TOKEN` et `PROJECT_REF` dans les secrets du dépôt.

> ℹ️ Le fichier `.vercelignore` peut exclure `supabase/functions/*` du déploiement Vercel, ce qui est normal : les Edge Functions sont hébergées par Supabase et doivent être déployées séparément via l’une des méthodes ci-dessus.

## Notes supplémentaires

- Prisma reste accessible avec `npx prisma studio` et `npx prisma migrate` au besoin.
- Les utilitaires Supabase, Stripe et Prisma sont regroupés dans `lib/`.
- Les composants React Router sont déclarés via `createBrowserRouter` dans `src/main.tsx` et couvrent l’ensemble des pages historiques de l’app.
