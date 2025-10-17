# Migration Lovable → Supabase

Ce guide décrit la procédure complète pour basculer la base de données Alfie Designer de Lovable Cloud vers votre instance Supabase.

## Sommaire
- [Préparation](#préparation)
- [Déploiement du schéma](#déploiement-du-schéma)
- [Import des données](#import-des-données)
- [Validation](#validation)
- [Correspondance des tables](#correspondance-des-tables)
- [FAQ](#faq)

## Préparation
1. Cloner le dépôt GitHub `Thalie0801/alfie-designer`.
2. Copier `.env.local` puis compléter `SUPABASE_SERVICE_KEY` et `SUPABASE_DB_URL`.
3. Installer les dépendances :
   ```bash
   npm install
   npm install --save-dev pg dotenv
   ```
4. Vérifier que `supabase_schema.sql` se trouve bien à la racine.

## Déploiement du schéma
```bash
node setup_supabase.js
```

Le script :
- applique l’intégralité du schéma (tables, vues, RLS, fonctions)
- crée le bucket `assets`
- configure `SITE_URL` pour l’auth Supabase
- signale les seeds manquants

> 💡 En cas de connexion SSL, ajoutez `?sslmode=require` à `SUPABASE_DB_URL`.

## Import des données
1. Exporter les tables Lovable au format JSON (`lovable export --format json`).
2. Ajuster les identifiants `job_id` au format `TEXT` si nécessaire.
3. Lancer :
   ```bash
   node import_data.js --data-file=./export.json
   ```
4. Pour un import incrémental, répétez la commande avec des fichiers filtrés par table.

## Validation
- **Audit complet** : `node validate_setup.js`
- **Vérification Auth / RLS** : `node validate_setup.js --check-auth`
- **Plan Studio** : `node setup_studio_plan.js b2494709@gmail.com`
- **Patch UI debug** : `git apply fix_debug_display.patch`

## Correspondance des tables

| Table | Description | Notes |
|-------|-------------|-------|
| `affiliate_clicks` | Trafic affiliés | `click_id` en `TEXT`, FK → `affiliates.id` |
| `affiliate_commissions` | Commissions MLM | FK vers `affiliate_conversions` |
| `affiliate_conversions` | Conversions d’abonnement | `status` (`pending`, `paid`, …) |
| `affiliate_payouts` | Paiements affiliés | `paid_at` nullable |
| `affiliates` | Profil affilié | Colonnes MLM (`affiliate_status`, `parent_id`) |
| `alfie_cache` | Cache prompts IA | Utiliser `prompt_hash` unique |
| `alfie_conversations` / `alfie_messages` | Discussions Alfie | `conversation_id` FK |
| `brands` | Brand kits utilisateur | `plan` basé sur `brand_plan` |
| `canva_designs` | Inspirations Canva | Lecture publique |
| `contact_requests` | Formulaire marketing | RLS admin |
| `counters_monthly` | KPI mensuels | Utiliser `increment_monthly_counters` |
| `credit_packs` | Packs de crédits | 4 entrées seedées |
| `credit_transactions` | Mouvement de crédits | `transaction_type` (`plan-credit`, `usage`, …) |
| `deliverable` | Générations livrables | FK → `brands` |
| `generation_logs` | Historique moteur IA | `status`, `engine`, `woofs_cost` |
| `jobs` | File de jobs (texte) | Trigger `set_job_short_id` actif |
| `media_generations` | Assets médias | `job_id` en `TEXT` sans FK |
| `news` | Annonces produit | Publication par admins |
| `payment_sessions` | Sessions Stripe | Plan + montant |
| `posts` | Drafts réseau sociaux | FK utilisateur -> `auth.users` |
| `profiles` | Profil utilisateur | Sync automatique via trigger | 
| `templates` | Templates Alfie | 4 seeds de base |
| `usage_event` | Tracking quota | FK deliverable optionnel |
| `user_roles` | Rôles applicatifs | Enum `app_role` |
| `video_segments` | Segments vidéos | `job_id` texte + FK `parent_video_id` |

## FAQ
**Le script SQL peut-il être relancé ?** Oui, il est idempotent (utilise `IF NOT EXISTS`).

**Comment vérifier les policies ?** `validate_setup.js --check-auth` tente une lecture non authentifiée pour confirmer la RLS.

**Comment migrer d’autres tables Lovable ?** Ajoutez-les dans votre export JSON puis relancez `import_data.js` (le schéma accepte les `upsert`).

**Comment gérer les secrets Stripe ?** Continuez d’utiliser le gestionnaire de secrets Lovable ; aucune clé n’est commitée.

Bonne migration !
