# Configuration Lovable ↔ Supabase

Ce document explique comment connecter le projet **Alfie Designer** hébergé sur Lovable à votre instance Supabase auto-gérée.

## 1. Préparer les variables d’environnement

1. Copier `.env.local` vers l’interface Lovable (`Project Settings → Environment Variables`).
2. Renseigner :
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_DB_URL` (chaine de connexion Postgres service-role)
   - `BASE_URL`
   - `STORAGE_BUCKET`
3. Ajouter également `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans la section **Client Variables** si Lovable les sépare des secrets serveur.

## 2. Déployer le schéma Supabase

Sur votre machine locale (ou via CI) :

```bash
npm install
npm install --save-dev pg dotenv
node setup_supabase.js
```

- `setup_supabase.js` applique `supabase_schema.sql`, crée le bucket de stockage et vérifie les seeds de référence.
- Assurez-vous que `SUPABASE_DB_URL` est le DSN service-role (`postgresql://postgres:...@db.supabase.co:5432/postgres`).

## 3. Vérifier l’authentification

```bash
node validate_setup.js --check-auth
```

Cette commande vérifie la configuration `SITE_URL`, la politique RLS de base et la possibilité de créer une session.

## 4. Brancher Lovable

Dans Lovable :

1. Ouvrez **Project → Settings → Integrations**.
2. Renseignez l’URL de la base de données Supabase et la clé service-role.
3. Sauvegardez puis déclenchez un déploiement pour recharger les variables.

## 5. Donner l’accès Studio

Après migration, exécutez :

```bash
node setup_studio_plan.js b2494709@gmail.com
```

Le script :
- crée/valide l’utilisateur dans `auth.users`
- force le plan `studio` dans `profiles`
- ajoute le rôle `admin`
- crédite 500 unités dans `credit_transactions`

## 6. Données existantes

- Exportez vos tables Lovable au format JSON.
- Utilisez `import_data.js --data-file=./export.json` pour les réinjecter.
- Référez-vous à `README_MIGRATION.md` pour la correspondance des colonnes.

## 7. Contrôles finaux

1. Lancer `node validate_setup.js` sans options pour un audit complet.
2. Ouvrir la page de connexion Lovable : le composant `SupabaseHealth` n’affichera plus le bandeau debug après application de `fix_debug_display.patch`.
3. Tester les principales actions (connexion, génération média, achats de crédits).

## 8. Support

- Scripts : dossier racine (`setup_supabase.js`, `setup_studio_plan.js`, `import_data.js`, `validate_setup.js`).
- Documentation : `README_MIGRATION.md`.
- Patch UI : `fix_debug_display.patch`.

> ℹ️  Tous les scripts utilisent ESM/Node 20. Pensez à exécuter `chmod +x` si nécessaire.
