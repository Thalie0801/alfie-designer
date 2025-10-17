# Connecter Lovable à Supabase

Cette procédure vous permet de continuer à utiliser Lovable comme IDE tout en déplaçant la base de données sur votre propre instance Supabase.

## 1. Préparer Supabase
1. Récupérez les variables d'environnement de votre projet Supabase :
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - Mot de passe de la base de données (`postgres`) pour construire `SUPABASE_DB_URL` :
     `postgresql://postgres:<mot-de-passe>@<ref>.supabase.co:5432/postgres`
2. Copiez le fichier `.env.local` fourni à la racine du dépôt puis remplacez les valeurs par défaut par vos secrets.
3. Optionnel : mettez à jour `config/lovable-auth-providers.json` avec vos identifiants OAuth.

## 2. Appliquer le schéma sur Supabase
```bash
npm install
node setup_supabase.js --step=schema
node setup_supabase.js --step=auth   # optionnel si vous souhaitez configurer les providers via le script
node setup_supabase.js --step=seed   # optionnel (insère les templates par défaut)
node setup_supabase.js --step=validate
```

> ℹ️  Le script nécessite un accès direct à la base Postgres via `SUPABASE_DB_URL`. Vous pouvez récupérer le mot de passe dans `Project Settings → Database → Connection info` sur Supabase.

## 3. Mettre à jour les variables Lovable
Dans Lovable :
1. Ouvrez votre projet.
2. Rendez-vous dans **Settings → Environment Variables**.
3. Créez ou mettez à jour les variables :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
4. Déclenchez un redéploiement (Lovable synchronise automatiquement les commits GitHub).

## 4. Vérifier l'authentification
1. Déployez la branche sur Lovable.
2. Ouvrez la page d'authentification : le bandeau de debug « ENV: ✅ (URL/ANON) » ne s'affiche plus.
3. Testez la création d'un compte ou la connexion via les providers configurés.

## 5. (Optionnel) Importer les données historiques
1. Exportez les données Lovable au format JSON (un objet par table).
2. Placez le fichier dans le dépôt, par exemple `data_export/full.json`.
3. Exécutez :
   ```bash
   node import_data.js --data-file=./data_export/full.json
   ```
4. Relancez `node setup_supabase.js --step=validate` pour afficher le nombre de lignes par table.

## 6. Maintenance continue
- Relancez `node setup_supabase.js --step=schema` après chaque évolution du schéma.
- Mettez à jour `config/lovable-auth-providers.json` lorsque vous ajoutez un provider OAuth.
- Stockez uniquement des valeurs de test dans le dépôt (les secrets doivent rester dans Lovable / Supabase).
