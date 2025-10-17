# Migration Lovable Cloud vers Supabase

Ce guide décrit la procédure recommandée pour migrer Alfie Designer depuis Lovable Cloud vers une instance Supabase auto-hébergée (avec Vercel pour le frontend).

## Prérequis

1. Installer les dépendances Node.js :
   ```bash
   npm install
   ```
2. Renseigner les secrets requis dans le fichier `.env.supabase` :
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_DB_URL`
   - `LOVABLE_DATABASE_URL`, `LOVABLE_SERVICE_KEY`, `LOVABLE_API_URL`, `LOVABLE_API_KEY`
3. Compléter `config/lovable-auth-providers.json` avec la configuration auth actuelle.
4. Vérifier l'accès aux bases de données source et cible depuis la machine qui exécutera la migration.

## Commandes principales

```bash
# Migration complète (toutes les étapes)
node migrate_to_supabase.js

# Étapes individuelles
node migrate_to_supabase.js --step=schema     # Analyse Lovable + création du schéma Supabase
node migrate_to_supabase.js --step=data       # Export JSON + import vers Supabase
node migrate_to_supabase.js --step=config     # Configuration de l'auth + mise à jour des URLs
node migrate_to_supabase.js --step=validate   # Vérifications finales + rapport de migration
```

Chaque exécution crée des journaux horodatés dans `migration_logs/`.

## Étapes détaillées

1. **Analyse du schéma** (`--step=schema`)
   - Interroge la base Lovable pour extraire colonnes, contraintes, index, séquences, triggers, fonctions et politiques RLS.
   - Génère `schema_backup.sql`, `scripts/migration/supabase_schema.sql` et `migration_artifacts/schema_metadata.json`.

2. **Export des données** (`--step=data`)
   - Crée un export JSON pour chaque table listée dans `data_export/`.
   - Effectue l'import dans Supabase en respectant les dépendances entre tables.

3. **Configuration Supabase** (`--step=config`)
   - Aligne les providers d'authentification sur la base du fichier `config/lovable-auth-providers.json`.
   - Migre les utilisateurs existants via l'API admin Supabase.
   - Met à jour les URLs `siteUrl` et les redirections Supabase Auth.

4. **Validation finale** (`--step=validate`)
   - Compare le nombre de lignes entre Lovable et Supabase.
   - Vérifie l'existence du schéma, des contraintes et des politiques RLS.
   - Génère `migration_report.md` avec un récapitulatif détaillé.

## Reprise et rollback

- Chaque étape est idempotente : relancez la même commande en cas d'échec, elle détectera les artefacts existants et reprendra au bon endroit.
- En cas de problème critique, restaurez les données Supabase via `schema_backup.sql` et les JSON présents dans `data_export/`.

## Déploiement Vercel

Une fois la migration validée, configurez les variables d'environnement Vercel :

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Les variables serveur (service key, DB URL) doivent rester hors du frontend et être injectées uniquement dans les fonctions Edge / Serverless.

## Résolution des problèmes

- **Erreur de connexion Postgres** : vérifier le pare-feu et les IP autorisées sur Supabase et Lovable.
- **Incohérence de contraintes** : relancer `node migrate_to_supabase.js --step=schema` pour rafraîchir le schéma puis `--step=data`.
- **Auth providers manquants** : compléter `config/lovable-auth-providers.json` et relancer `--step=config`.

Pour plus de détails, consulter les journaux dans `migration_logs/` ou ouvrir un ticket interne.
