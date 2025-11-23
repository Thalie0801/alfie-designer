# Guide de Déploiement - Réparation du Flux de Génération

## 🚀 Déploiement Rapide

Ce guide vous permet de déployer les corrections en **moins de 5 minutes**.

## Prérequis

- Accès au projet Supabase
- CLI Supabase installée (`npm install -g supabase`)
- Authentification configurée (`supabase login`)

## Étapes de Déploiement

### 1️⃣ Déployer les Fonctions Edge

```bash
# Se placer dans le répertoire du projet
cd /path/to/alfie-designer

# Déployer generate-media
supabase functions deploy generate-media

# Déployer track-job-status
supabase functions deploy track-job-status
```

**Vérification** :
```bash
# Lister les fonctions déployées
supabase functions list

# Tester generate-media
curl -X POST https://your-project.supabase.co/functions/v1/generate-media \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Devrait retourner une erreur 400 (MISSING_USER_OR_BRAND) = fonction accessible ✅
```

### 2️⃣ Appliquer la Migration

```bash
# Appliquer toutes les migrations en attente
supabase db push
```

**OU** manuellement via le Dashboard Supabase :

1. Aller dans **Database** → **SQL Editor**
2. Copier le contenu de `supabase/migrations/20251123_fix_media_generation_flow.sql`
3. Exécuter le script
4. Vérifier qu'il n'y a pas d'erreurs

**Vérification** :
```sql
-- Vérifier que le trigger existe
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_sync_job_to_media';

-- Vérifier que la fonction existe
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'sync_job_completion_to_media_generations';

-- Vérifier que l'index existe
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE indexname = 'idx_media_generations_job_output';
```

### 3️⃣ Tester le Flux Complet

```bash
# Exécuter le script de test
./test_generation_flow.sh

# OU tester manuellement
export TEST_USER_ID="votre-user-id"
export TEST_BRAND_ID="votre-brand-id"
./test_generation_flow.sh
```

## 🔍 Vérification Post-Déploiement

### Checklist

- [ ] `generate-media` est déployée et accessible
- [ ] `track-job-status` est déployée et accessible
- [ ] Le trigger `trigger_sync_job_to_media` existe
- [ ] La fonction `sync_job_completion_to_media_generations()` existe
- [ ] L'index `idx_media_generations_job_output` existe
- [ ] Un test de génération d'image fonctionne de bout en bout

### Test Manuel Complet

#### 1. Créer un job

```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-media \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-user",
    "brandId": "uuid-brand",
    "kind": "image",
    "count": 1,
    "ratio": "1:1",
    "prompt": "Un magnifique coucher de soleil sur la mer"
  }'
```

**Réponse attendue** :
```json
{
  "ok": true,
  "jobId": "uuid-du-job"
}
```

#### 2. Vérifier dans job_queue

```sql
SELECT id, status, type, created_at, payload 
FROM job_queue 
WHERE id = 'uuid-du-job';
```

**Résultat attendu** :
- `status`: `'queued'` (puis `'running'` puis `'completed'`)
- `type`: `'render_images'`
- `payload`: contient `intent.brandId`, `intent.topic`, etc.

#### 3. Déclencher le worker

Le worker `process-job-worker` doit être appelé périodiquement (via un cron job ou manuellement) :

```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-job-worker \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "X-Internal-Secret: YOUR_INTERNAL_SECRET"
```

**OU** si vous avez un cron configuré, attendez simplement qu'il s'exécute.

#### 4. Vérifier dans media_generations

```sql
SELECT id, user_id, brand_id, type, status, output_url, job_id, created_at
FROM media_generations
WHERE job_id = 'uuid-du-job';
```

**Résultat attendu** :
- Au moins 1 ligne
- `type`: `'image'`
- `status`: `'completed'`
- `output_url`: URL de l'image générée
- `job_id`: `'uuid-du-job'`

#### 5. Vérifier dans le Studio

1. Se connecter au Studio Alfie Designer
2. Aller dans la bibliothèque d'images
3. Vérifier que l'image apparaît bien

## 🐛 Dépannage

### Problème : La fonction generate-media retourne une erreur 500

**Causes possibles** :
- Variables d'environnement manquantes (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Erreur dans le code TypeScript

**Solution** :
```bash
# Vérifier les logs
supabase functions logs generate-media --tail

# Redéployer
supabase functions deploy generate-media
```

### Problème : Le job reste bloqué en status 'queued'

**Causes possibles** :
- Le worker `process-job-worker` n'est pas appelé
- Le worker échoue silencieusement

**Solution** :
```bash
# Appeler manuellement le worker
curl -X POST https://your-project.supabase.co/functions/v1/process-job-worker \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# Vérifier les logs du worker
supabase functions logs process-job-worker --tail

# Vérifier le statut du job
psql -c "SELECT id, status, error FROM job_queue WHERE status != 'completed' ORDER BY created_at DESC LIMIT 10;"
```

### Problème : L'image n'apparaît pas dans media_generations

**Causes possibles** :
- Le worker a échoué à insérer
- Le trigger n'a pas été créé
- Le job n'est pas passé à `'completed'`

**Solution** :
```bash
# Vérifier que le trigger existe
psql -c "SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_sync_job_to_media';"

# Forcer le passage à 'completed' pour tester le trigger
psql -c "UPDATE job_queue SET status = 'completed', result = '{\"outputs\": [\"https://test.com/image.jpg\"]}' WHERE id = 'uuid-du-job';"

# Vérifier les logs PostgreSQL
# Dashboard Supabase → Database → Logs
```

### Problème : Le WebSocket ne renvoie pas de mises à jour

**Causes possibles** :
- La fonction `track-job-status` n'est pas déployée
- Le frontend se connecte à la mauvaise URL
- Le job n'existe pas dans `job_queue`

**Solution** :
```bash
# Vérifier que la fonction est déployée
supabase functions list | grep track-job-status

# Tester la connexion WebSocket
wscat -c "wss://your-project.supabase.co/functions/v1/track-job-status"
# Puis envoyer : {"type": "subscribe", "jobId": "uuid-du-job"}

# Vérifier les logs
supabase functions logs track-job-status --tail
```

## 📊 Monitoring

### Requêtes Utiles

```sql
-- Nombre de jobs par statut
SELECT status, COUNT(*) 
FROM job_queue 
GROUP BY status;

-- Jobs échoués récents
SELECT id, type, error, created_at 
FROM job_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;

-- Images générées aujourd'hui
SELECT COUNT(*) 
FROM media_generations 
WHERE created_at >= CURRENT_DATE;

-- Jobs en attente depuis plus de 5 minutes
SELECT id, type, created_at, 
  NOW() - created_at AS waiting_time
FROM job_queue 
WHERE status = 'queued' 
  AND created_at < NOW() - INTERVAL '5 minutes';
```

### Dashboard Supabase

1. **Logs des Edge Functions** : Dashboard → Logs → Edge Functions
2. **Logs PostgreSQL** : Dashboard → Database → Logs
3. **Métriques** : Dashboard → Reports

## 🔄 Rollback (En cas de problème)

### Annuler les modifications

```bash
# 1. Supprimer le trigger
psql -c "DROP TRIGGER IF EXISTS trigger_sync_job_to_media ON job_queue;"

# 2. Supprimer la fonction
psql -c "DROP FUNCTION IF EXISTS sync_job_completion_to_media_generations();"

# 3. Redéployer les anciennes versions des fonctions
git checkout HEAD~1 supabase/functions/generate-media/index.ts
git checkout HEAD~1 supabase/functions/track-job-status/index.ts
supabase functions deploy generate-media
supabase functions deploy track-job-status
```

## 📞 Support

En cas de problème persistant :

1. Consulter `FLUX_GENERATION_REPAIR.md` pour comprendre le flux complet
2. Vérifier les logs à chaque étape du flux
3. Tester chaque composant individuellement
4. Contacter l'équipe de développement avec :
   - Les logs d'erreur
   - L'ID du job problématique
   - Les résultats des requêtes SQL de vérification

---

**Temps estimé de déploiement** : 5 minutes  
**Temps estimé de vérification** : 10 minutes  
**Temps total** : ~15 minutes
