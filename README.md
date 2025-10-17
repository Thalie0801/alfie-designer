# Alfie Designer Platform

Plateforme SaaS en cours de construction reposant sur Next.js 14 (App Router), Prisma et Supabase pour la persistance, Stripe pour la facturation et un stockage d’assets sur Supabase Storage.

## Prérequis

- Node.js >= 20
- npm >= 9
- Accès à une base Postgres (Supabase recommandé)
- Clés Stripe (mode test) pour les webhooks de facturation

## Configuration de l’environnement

1. Copiez le fichier `.env.example` vers `.env` et complétez les valeurs :
   ```bash
   cp .env.example .env
   ```
2. Renseignez les URL/clefs Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), l’URL de stockage (`STORAGE_BUCKET`), la base de données (`DATABASE_URL`, `DIRECT_URL`) ainsi que les secrets Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
3. Définissez `BASE_URL` sur l’URL publique (ou `http://localhost:3000` en local).

## Installation et base de données

```bash
npm install
npm run db:push
```

Ces commandes installent les dépendances puis poussent le schéma Prisma vers la base configurée.

### Studio Prisma (optionnel)

```bash
npm run db:studio
```

### Seed de développement (optionnel)

Un script de seed crée un utilisateur de démonstration, un projet et crédite 50 unités :

```bash
npx ts-node prisma/seed.mts
```

## Lancer l’application

```bash
npm run dev
```

Le serveur Next.js démarre sur `http://localhost:3000`.

## API de génération

L’API `POST /api/generate/image` permet de générer des assets (stub). Exemple de requête avec `curl` :

```bash
curl -X POST http://localhost:3000/api/generate/image \
  -H 'Content-Type: application/json' \
  -H 'x-demo-user: demo@alfie-designer.test' \
  -d '{
    "projectId": "<PROJECT_ID>",
    "prompt": "Affiche futuriste pour Alfie Designer",
    "aspect": "1:1",
    "count": 1
  }'
```

Réponse attendue :

```json
{
  "assets": [
    {
      "id": "...",
      "url": "https://...",
      "thumbUrl": null,
      "aspect": "1:1",
      "mediaType": "image"
    }
  ]
}
```

> ℹ️ Les routes exigent l’en-tête `x-demo-user` tant que l’authentification n’est pas branchée. Utilisez `x-demo-admin: true` pour les routes d’administration (crédit manuel).

## Gestion des crédits & facturation

- Les crédits sont enregistrés dans la table `CreditLedger`. Chaque génération décrémente le solde, chaque succès Stripe le crédite.
- Les webhooks Stripe (`POST /api/webhooks/stripe`) valident la signature avant de mettre à jour `Subscription` et d’ajouter les crédits correspondant aux plans (`starter` = 50, `pro` = 200).
- Pour tester en local, configurez Stripe CLI :
  ```bash
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ```

## Stockage Supabase

Les assets générés sont téléversés dans le bucket défini par `STORAGE_BUCKET` via les helpers de `lib/storage.ts`. Les URLs retournées sont publiques par défaut ; adaptez la stratégie (signatures privées, thumbnails) selon vos besoins.

## Intégration front

- La page Next.js `app/generator/page.tsx` contient les instructions pour brancher l’UI de génération existante (située dans `src/components`).
- Le fichier `lib/api.ts` expose des utilitaires (`generateImages`, `listAssets`) prêts à être utilisés côté client.

## Roadmap / TODO

- Brancher une authentification réelle (Clerk, NextAuth, Supabase Auth…).
- Remplacer les stubs de génération par l’intégration fournisseur (images et vidéos).
- Mettre en place une file d’attente vidéo et la gestion des miniatures.
- Finaliser la migration complète vers l’App Router sur l’ensemble de l’interface.
