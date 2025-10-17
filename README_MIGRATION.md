# Migration Lovable Cloud → Supabase (Auto-hébergement)

Ce guide explique comment créer la base Supabase à partir du code du dépôt puis reconnecter Lovable dessus. Toutes les étapes sont réalisables sans clé API Lovable : seule votre instance Supabase est nécessaire.

## Fichiers utiles

| Fichier | Rôle |
| --- | --- |
| `db/migrations/*.sql` | Schéma officiel extrait du dépôt (tables, contraintes, RLS) |
| `supabase/migrations/*.sql` | Compléments Lovable (policies, fonctions) appliqués automatiquement si présents |
| `setup_supabase.js` | Script Node.js qui applique les migrations, configure l'auth et valide les tables |
| `import_data.js` | Import optionnel de données JSON |
| `.env.local` | Modèle des variables d'environnement à copier dans Lovable |

## Prérequis

- Node.js ≥ 18
- URL Supabase + clefs `anon` et `service_role`
- Mot de passe de la base (dans **Project Settings → Database → Connection string → URI**) pour construire `SUPABASE_DB_URL`
- Accès au dépôt (via GitHub ou Lovable)

## Étapes pas à pas

### 1. Préparer les variables d'environnement

1. Dupliquez `.env.local` en `.env.local.localhost` (ou exportez les variables dans votre shell).
2. Remplacez les valeurs par celles de votre projet :
   ```env
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<clé anon>
   SUPABASE_SERVICE_KEY=<clé service_role>
   SUPABASE_DB_URL=postgresql://postgres:<mot-de-passe>@<ref>.supabase.co:5432/postgres
   ```
3. Ajoutez les mêmes variables dans Lovable (**Settings → Environment Variables**). Seules les valeurs `VITE_*` sont nécessaires côté front, mais conserver les clés admin simplifie les scripts.

### 2. Appliquer le schéma Supabase

```bash
npm install
node setup_supabase.js --step=schema
```

- Le script lit d'abord `db/migrations/` (schéma principal), puis `supabase/migrations/` s'ils existent.
- Pour rejouer un fichier spécifique, utilisez `node setup_supabase.js --step=schema --schema=./supabase_schema.sql`.
- La sortie affiche chaque fichier appliqué (`Applying [x/y] ...`). En cas d'erreur, le nom du fichier fautif est indiqué.

### 3. Vérifier les tables créées

```bash
node setup_supabase.js --step=validate
```

Vous devriez voir un tableau avec les tables essentielles et le nombre de lignes (0 juste après la création). Ouvrez ensuite Supabase Studio → **Table Editor** pour confirmer la présence des tables.

### 4. Configurer l'authentification (optionnel)

1. Complétez `config/lovable-auth-providers.json` avec vos identifiants OAuth.
2. Exécutez `node setup_supabase.js --step=auth` pour pousser la configuration vers Supabase.

### 5. Importer des données (optionnel)

1. Construisez un fichier JSON contenant vos données (clé = nom de la table).
2. Lancez :
   ```bash
   node import_data.js --data-file=./data_export/mon_export.json
   ```
3. Relancez `node setup_supabase.js --step=validate` pour vérifier les compteurs.

### 6. Synchroniser Lovable

1. Commitez et poussez vos modifications sur GitHub.
2. Lovable détecte la mise à jour, récupère les nouvelles variables et reconstruit l'application.
3. À l'ouverture de la page de connexion, le bandeau `ENV: ✅ (URL/ANON)` a disparu : seules les erreurs réelles s'affichent.

## Dépannage

- `Missing required environment variable: SUPABASE_SERVICE_KEY` → La clé `service_role` n'est pas chargée dans votre shell.
- `SUPABASE_DB_URL is required` → Copiez l'URI Postgres fournie par Supabase (pensez à générer le mot de passe si besoin).
- Bloqué par RLS lors d'un import manuel → ajoutez les en-têtes `apikey` et `Authorization` avec la clé `service_role`.
- Aucun changement dans Supabase Studio → vérifiez que le script n'a pas levé d'erreur et que votre IP est autorisée dans **Project Settings → Database → Network**.

Bon courage pour la migration !
