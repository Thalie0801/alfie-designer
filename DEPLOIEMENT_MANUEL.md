# Guide de Déploiement Manuel via l'Interface Supabase

## 🎯 Objectif

Déployer les corrections du flux de génération d'images sans utiliser la CLI Supabase.

## ⏱️ Temps Estimé

**15 minutes** (5 min pour les fonctions + 2 min pour la migration + 8 min de vérification)

---

## 📋 Prérequis

- ✅ Accès au Dashboard Supabase : https://supabase.com/dashboard
- ✅ Droits d'administration sur le projet
- ✅ Les fichiers du dépôt GitHub (branche `fix/image-generation-flow`)

---

## 🚀 Étape 1 : Déployer la Fonction `generate-media`

### 1.1 Ouvrir le Dashboard

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet Alfie Designer
3. Dans le menu latéral, cliquer sur **Edge Functions**

### 1.2 Trouver la fonction

1. Chercher `generate-media` dans la liste des fonctions
2. Cliquer dessus pour l'ouvrir

### 1.3 Remplacer le code

1. Supprimer tout le code existant
2. Copier le nouveau code depuis GitHub :
   - URL : https://github.com/Thalie0801/alfie-designer/blob/fix/image-generation-flow/supabase/functions/generate-media/index.ts
   - Ou ouvrir le fichier local : `supabase/functions/generate-media/index.ts`
3. Coller le nouveau code
4. Cliquer sur **Deploy** ou **Save**

### 1.4 Vérifier le déploiement

```bash
# Tester que la fonction répond
curl -X POST https://your-project.supabase.co/functions/v1/generate-media \
  -H "Content-Type: application/json" \
  -d '{}'

# Devrait retourner une erreur 400 (MISSING_USER_OR_BRAND) = fonction accessible ✅
```

---

## 🚀 Étape 2 : Déployer la Fonction `track-job-status`

### 2.1 Trouver la fonction

1. Retourner dans **Edge Functions**
2. Chercher `track-job-status`
3. Cliquer dessus

### 2.2 Remplacer le code

1. Supprimer tout le code existant
2. Copier le nouveau code depuis GitHub :
   - URL : https://github.com/Thalie0801/alfie-designer/blob/fix/image-generation-flow/supabase/functions/track-job-status/index.ts
   - Ou ouvrir le fichier local : `supabase/functions/track-job-status/index.ts`
3. Coller le nouveau code
4. Cliquer sur **Deploy** ou **Save**

### 2.3 Vérifier le déploiement

```bash
# Tester que la fonction répond
curl https://your-project.supabase.co/functions/v1/track-job-status

# Devrait retourner une erreur 400 (Expected WebSocket) = fonction accessible ✅
```

---

## 🗄️ Étape 3 : Appliquer la Migration SQL

### 3.1 Ouvrir le SQL Editor

1. Dans le Dashboard Supabase
2. Cliquer sur **Database** dans le menu latéral
3. Cliquer sur **SQL Editor**

### 3.2 Créer une nouvelle requête

1. Cliquer sur **New Query** ou **+ New**
2. Nommer la requête : `Fix Media Generation Flow`

### 3.3 Copier le script SQL

1. Ouvrir le fichier de migration :
   - URL : https://github.com/Thalie0801/alfie-designer/blob/fix/image-generation-flow/supabase/migrations/20251123_fix_media_generation_flow.sql
   - Ou ouvrir le fichier local : `supabase/migrations/20251123_fix_media_generation_flow.sql`
2. Copier **tout le contenu** du fichier
3. Coller dans le SQL Editor

### 3.4 Exécuter le script

1. Cliquer sur **Run** ou **Execute** (en bas à droite)
2. Attendre que l'exécution se termine
3. Vérifier qu'il n'y a **aucune erreur** (messages en rouge)

### 3.5 Vérifier la migration

Exécuter ces requêtes de vérification dans le SQL Editor :

```sql
-- Vérifier que le trigger existe
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_sync_job_to_media';
-- Devrait retourner 1 ligne

-- Vérifier que la fonction existe
SELECT proname 
FROM pg_proc 
WHERE proname = 'sync_job_completion_to_media_generations';
-- Devrait retourner 1 ligne

-- Vérifier que l'index existe
SELECT indexname 
FROM pg_indexes 
WHERE indexname = 'idx_media_generations_job_output';
-- Devrait retourner 1 ligne
```

**Résultat attendu** : Chaque requête doit retourner **1 ligne**. Si c'est le cas, la migration est réussie ✅

---

## 🧪 Étape 4 : Tester le Flux Complet

### 4.1 Créer un job de test

Remplacer `YOUR_TOKEN`, `YOUR_USER_ID`, et `YOUR_BRAND_ID` par vos vraies valeurs :

```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "brandId": "YOUR_BRAND_ID",
    "kind": "image",
    "count": 1,
    "ratio": "1:1",
    "prompt": "Test de déploiement - Un magnifique coucher de soleil"
  }'
```

**Réponse attendue** :
```json
{
  "ok": true,
  "jobId": "uuid-du-job"
}
```

### 4.2 Vérifier dans la base de données

Dans le SQL Editor, exécuter :

```sql
-- Remplacer 'uuid-du-job' par le jobId reçu
SELECT id, status, type, created_at 
FROM job_queue 
WHERE id = 'uuid-du-job';
```

**Résultat attendu** : 1 ligne avec `status = 'queued'` (puis `'running'` puis `'completed'`)

### 4.3 Attendre le traitement

Attendre **10-30 secondes** que le worker traite le job.

### 4.4 Vérifier dans media_generations

```sql
-- Remplacer 'uuid-du-job' par le jobId
SELECT id, user_id, brand_id, type, status, output_url 
FROM media_generations 
WHERE job_id = 'uuid-du-job';
```

**Résultat attendu** : 1 ligne avec :
- `type = 'image'`
- `status = 'completed'`
- `output_url` contenant l'URL de l'image

### 4.5 Vérifier dans le Studio

1. Se connecter au Studio Alfie Designer
2. Aller dans la **bibliothèque d'images**
3. Vérifier que l'image de test apparaît

**Si l'image apparaît** : ✅ **Déploiement réussi !**

---

## ✅ Checklist de Validation

Cocher chaque étape une fois terminée :

- [ ] Fonction `generate-media` déployée
- [ ] Fonction `track-job-status` déployée
- [ ] Migration SQL exécutée sans erreur
- [ ] Trigger `trigger_sync_job_to_media` créé
- [ ] Fonction `sync_job_completion_to_media_generations` créée
- [ ] Index `idx_media_generations_job_output` créé
- [ ] Job de test créé avec succès
- [ ] Job apparaît dans `job_queue`
- [ ] Image apparaît dans `media_generations`
- [ ] Image visible dans la bibliothèque du Studio

---

## 🐛 Dépannage

### Problème : La fonction ne se déploie pas

**Solution** :
1. Vérifier qu'il n'y a pas d'erreur de syntaxe dans le code
2. Vérifier que les imports sont corrects
3. Essayer de redéployer

### Problème : La migration SQL échoue

**Causes possibles** :
- Le trigger existe déjà
- La fonction existe déjà

**Solution** :
```sql
-- Supprimer l'ancien trigger et la fonction
DROP TRIGGER IF EXISTS trigger_sync_job_to_media ON job_queue;
DROP FUNCTION IF EXISTS sync_job_completion_to_media_generations();

-- Puis réexécuter la migration complète
```

### Problème : Le job reste en status 'queued'

**Cause** : Le worker `process-job-worker` n'est pas appelé

**Solution** :
1. Vérifier que le worker est configuré (cron job ou appel manuel)
2. Appeler manuellement le worker :
```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-job-worker \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Problème : L'image n'apparaît pas dans media_generations

**Solution** :
1. Vérifier que le trigger est bien créé
2. Forcer le passage à 'completed' pour tester :
```sql
UPDATE job_queue 
SET status = 'completed', 
    result = '{"outputs": ["https://test.com/image.jpg"]}'::jsonb 
WHERE id = 'uuid-du-job';
```
3. Vérifier si une entrée est créée dans `media_generations`

---

## 📊 Logs et Monitoring

### Consulter les logs des fonctions

1. Dashboard Supabase → **Logs**
2. Sélectionner **Edge Functions**
3. Filtrer par fonction (`generate-media` ou `track-job-status`)

### Consulter les logs PostgreSQL

1. Dashboard Supabase → **Database** → **Logs**
2. Chercher les messages du trigger (mots-clés : `sync_job`, `media_generation`)

---

## 🔄 Rollback (En cas de problème)

Si vous rencontrez des problèmes, vous pouvez annuler les modifications :

### 1. Supprimer le trigger

```sql
DROP TRIGGER IF EXISTS trigger_sync_job_to_media ON job_queue;
DROP FUNCTION IF EXISTS sync_job_completion_to_media_generations();
DROP INDEX IF EXISTS idx_media_generations_job_output;
```

### 2. Restaurer les anciennes versions des fonctions

1. Aller dans **Edge Functions**
2. Pour chaque fonction, cliquer sur **History** ou **Versions**
3. Sélectionner la version précédente
4. Cliquer sur **Restore** ou **Rollback**

---

## 📞 Support

En cas de problème persistant :

1. Consulter les logs Supabase
2. Vérifier chaque étape de ce guide
3. Consulter `DEPLOYMENT_GUIDE.md` pour plus de détails
4. Contacter l'équipe avec :
   - Les logs d'erreur
   - L'étape où le problème survient
   - Les résultats des requêtes SQL de vérification

---

**Temps total estimé** : 15 minutes

**Difficulté** : Facile

**Prérequis techniques** : Aucun (juste copier-coller)

**Risque** : Faible (rollback simple)

---

✅ **Une fois toutes les étapes terminées, le flux de génération d'images sera 100% fonctionnel !**
