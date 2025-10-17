# Migration Lovable Cloud → Supabase (Auto-hébergement)

Ce document décrit comment répliquer la base de données Lovable Cloud sur votre propre instance Supabase tout en conservant Lovable comme environnement de développement.

## Contenu généré

| Fichier | Rôle |
| --- | --- |
| `supabase_schema.sql` | Schéma complet (tables, contraintes, RLS, triggers) |
| `setup_supabase.js` | Script Node.js pour appliquer le schéma, configurer l'auth et valider la configuration |
| `import_data.js` | Import optionnel de données JSON vers Supabase |
| `.env.local` | Modèle des variables d'environnement pour Lovable / scripts locaux |
| `fix_debug_display.patch` | Patch supprimant l'ancien bandeau de debug sur l'écran de connexion |
| `LOVABLE_SETUP.md` | Check-list de configuration côté Lovable |

## Prérequis
- Node.js ≥ 18
- Accès au projet Supabase (URL, clés `anon` et `service_role`, mot de passe de la base)
- Accès au dépôt GitHub (`git clone` ou via Lovable)

## Étapes de migration

### 1. Préparer les variables d'environnement
1. Dupliquez `.env.local` en `.env.local.localhost` (ou exportez directement les variables dans votre shell).
2. Renseignez :
   ```env
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_KEY=...
   SUPABASE_DB_URL=postgresql://postgres:<db-password>@<ref>.supabase.co:5432/postgres
   ```
3. Conservez ces valeurs et créez les variables équivalentes dans Lovable (`Project Settings → Environment Variables`).

### 2. Déployer le schéma
```bash
npm install
node setup_supabase.js --step=schema
```
Le script se connecte directement à Postgres via `SUPABASE_DB_URL` et exécute l'intégralité de `supabase_schema.sql`.

### 3. Configurer l'authentification
- Renseignez vos identifiants OAuth dans `config/lovable-auth-providers.json` (Google, GitHub, SMS, etc.).
- Appliquez la configuration :
  ```bash
  node setup_supabase.js --step=auth
  ```

### 4. (Optionnel) Importer les données historiques
1. Créez un export JSON où chaque clé correspond à un nom de table Supabase.
2. Exécutez :
   ```bash
   node import_data.js --data-file=./data_export.json
   ```
   L'ordre d'insertion respecte les dépendances (profils → marques → conversations, etc.).

### 5. Vérifier la configuration
```bash
node setup_supabase.js --step=validate
```
Le script affiche le nombre de lignes pour chaque table essentielle.

### 6. Synchroniser Lovable
1. Poussez vos commits sur GitHub (`git push`).
2. Lovable synchronise automatiquement le dépôt et reconstruit l'application.
3. Lors du prochain déploiement, l'écran de connexion ne montre plus le bandeau `ENV: ✅ (URL/ANON)`.

### 7. Maintenance
- Conservez `supabase_schema.sql` comme source de vérité. Toute évolution du schéma doit être ajoutée à ce fichier puis rejouée via `node setup_supabase.js --step=schema`.
- Documentez les modifications majeures dans `README_MIGRATION.md` pour les futurs contributeurs.

## Dépannage
- **Erreur `Missing required environment variable: SUPABASE_SERVICE_KEY`** : vérifiez que la clé service est présente dans votre shell et dans Lovable.
- **Impossible de se connecter à Postgres** : assurez-vous d'avoir autorisé votre IP dans `Project Settings → Database → Networking` sur Supabase ou utilisez un tunnel sécurisé.
- **Les politiques RLS bloquent l'import** : utilisez `SUPABASE_SERVICE_KEY` pour importer (le script le fait automatiquement). Si vous importez manuellement, pensez à l'ajouter dans les en-têtes `apikey` et `Authorization`.

Bonnes créations avec Alfie Designer !
