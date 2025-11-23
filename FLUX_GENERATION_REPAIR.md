# Réparation du Flux de Génération d'Images - Alfie Designer

## 📋 Résumé Exécutif

Ce document détaille les modifications apportées pour réparer le flux de génération d'images dans Alfie Designer. Le problème principal était que les images générées n'apparaissaient pas dans la bibliothèque du Studio.

## 🔍 Problèmes Identifiés

### 1. Confusion entre deux tables `jobs`

Le projet contient deux tables distinctes pour gérer les jobs :

- **`jobs`** : Liée à `job_sets`, utilisée pour les carrousels et le système de chat
- **`job_queue`** : Utilisée par le worker `process-job-worker` pour traiter les jobs de génération

**Impact** : La fonction `generate-media` insérait dans la mauvaise table (`jobs` au lieu de `job_queue`), ce qui empêchait le worker de traiter les demandes.

### 2. Manque de synchronisation automatique

Bien que `process-job-worker` insère manuellement dans `media_generations`, il n'existait aucun mécanisme de secours (trigger) pour garantir la synchronisation en cas d'échec du worker.

### 3. WebSocket pointant vers la mauvaise table

La fonction `track-job-status` (WebSocket pour le suivi en temps réel) interrogeait la table `jobs` au lieu de `job_queue`.

## ✅ Modifications Apportées

### 1. Fonction `generate-media` (Corrigée)

**Fichier** : `supabase/functions/generate-media/index.ts`

**Changements** :
- ✅ Insertion dans `job_queue` au lieu de `jobs`
- ✅ Mapping correct du `kind` vers le `type` de job :
  - `"carousel"` → `"render_carousels"`
  - `"video"` → `"generate_video"`
  - Par défaut → `"render_images"`
- ✅ Structure du payload conforme aux attentes du worker :
  ```typescript
  {
    intent: {
      brandId: string,
      topic: string,
      ratio: string,
      count: number
    }
  }
  ```

**Avant** :
```typescript
const { data: job } = await supabaseAdmin
  .from("jobs")  // ❌ Mauvaise table
  .insert({ status: "queued", prompt, metadata })
```

**Après** :
```typescript
const { data: job } = await supabaseAdmin
  .from("job_queue")  // ✅ Bonne table
  .insert({ user_id: userId, type: jobType, status: "queued", payload })
```

### 2. Fonction `track-job-status` (Corrigée)

**Fichier** : `supabase/functions/track-job-status/index.ts`

**Changements** :
- ✅ Lecture depuis `job_queue` au lieu de `jobs`
- ✅ Adaptation des statuts (`queued`, `running`, `completed`, `failed`)
- ✅ Calcul du progrès basé sur le statut
- ✅ Retour du champ `result` au lieu de `output_data`

**Avant** :
```typescript
const { data: job } = await supabase
  .from('jobs')  // ❌ Mauvaise table
  .select('*')
  .eq('id', activeJobId)
```

**Après** :
```typescript
const { data: job } = await supabase
  .from('job_queue')  // ✅ Bonne table
  .select('*')
  .eq('id', activeJobId)
```

### 3. Trigger de Synchronisation (Nouveau)

**Fichier** : `supabase/migrations/20251123_fix_media_generation_flow.sql`

**Fonctionnalité** :
- ✅ Trigger automatique sur `job_queue` quand un job passe à `completed`
- ✅ Extraction des URLs d'images depuis `result.outputs`
- ✅ Insertion dans `media_generations` avec toutes les métadonnées nécessaires
- ✅ Protection contre les doublons (vérification `job_id` + `output_url`)
- ✅ Index optimisé pour les vérifications de doublons

**Logique** :
```sql
CREATE TRIGGER trigger_sync_job_to_media
  AFTER UPDATE ON job_queue
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION sync_job_completion_to_media_generations();
```

## 🔄 Flux Complet (Réparé)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUX DE GÉNÉRATION D'IMAGES                  │
└─────────────────────────────────────────────────────────────────┘

1. Frontend appelle generate-media
   POST /functions/v1/generate-media
   Body: { userId, brandId, kind, count, ratio, prompt }
   
   ↓

2. generate-media crée un job dans job_queue
   INSERT INTO job_queue (user_id, type, status, payload)
   VALUES (userId, 'render_images', 'queued', {...})
   
   ↓

3. Frontend s'abonne au WebSocket track-job-status
   WebSocket: subscribe { jobId }
   
   ↓

4. Worker process-job-worker récupère le job
   SELECT * FROM job_queue WHERE status = 'queued' LIMIT 1 FOR UPDATE
   UPDATE job_queue SET status = 'running'
   
   ↓

5. Worker appelle alfie-render-image
   POST /functions/v1/alfie-render-image
   Body: { userId, brand_id, prompt, resolution }
   
   ↓

6. Worker insère dans media_generations
   INSERT INTO media_generations (user_id, brand_id, type, output_url, ...)
   
   ↓

7. Worker marque le job comme complété
   UPDATE job_queue SET status = 'completed', result = { outputs: [...] }
   
   ↓

8. Trigger sync_job_completion_to_media_generations (filet de sécurité)
   Si media_generations n'a pas été créé, le trigger le fait automatiquement
   
   ↓

9. WebSocket notifie le frontend
   { type: 'job_complete', status: 'completed', result: {...} }
   
   ↓

10. Frontend affiche l'image dans la bibliothèque du Studio
    Lecture depuis media_generations WHERE user_id = ... AND brand_id = ...
```

## 📊 Tables Impliquées

### `job_queue`
```sql
CREATE TABLE job_queue (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  order_id uuid,
  type text CHECK (type IN ('render_images', 'render_carousels', 'generate_video')),
  status text CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  payload jsonb NOT NULL,
  result jsonb,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  retry_count int DEFAULT 0,
  max_retries int DEFAULT 3
);
```

### `media_generations`
```sql
CREATE TABLE media_generations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  brand_id uuid NOT NULL,
  type text CHECK (type IN ('image', 'video', 'improved_image')),
  status text CHECK (status IN ('processing', 'completed', 'failed')),
  prompt text,
  output_url text NOT NULL,
  job_id text,  -- Référence à job_queue.id
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## 🧪 Tests Recommandés

### Test 1 : Génération d'une image simple

```bash
# Appeler generate-media
curl -X POST https://your-project.supabase.co/functions/v1/generate-media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-user",
    "brandId": "uuid-brand",
    "kind": "image",
    "count": 1,
    "ratio": "1:1",
    "prompt": "Un chat mignon sur un canapé"
  }'

# Réponse attendue
{
  "ok": true,
  "jobId": "uuid-job"
}
```

### Test 2 : Vérification dans job_queue

```sql
SELECT * FROM job_queue WHERE id = 'uuid-job';

-- Résultat attendu
-- status: 'queued' → 'running' → 'completed'
-- result: { "outputs": ["https://..."] }
```

### Test 3 : Vérification dans media_generations

```sql
SELECT * FROM media_generations WHERE job_id = 'uuid-job';

-- Résultat attendu
-- 1 ligne avec :
-- - user_id: uuid-user
-- - brand_id: uuid-brand
-- - type: 'image'
-- - status: 'completed'
-- - output_url: 'https://...'
```

### Test 4 : WebSocket de suivi

```javascript
const ws = new WebSocket('wss://your-project.supabase.co/functions/v1/track-job-status');

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'subscribe', jobId: 'uuid-job' }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
  // Attendu :
  // { type: 'job_update', status: 'queued', progress: 0 }
  // { type: 'job_update', status: 'running', progress: 50 }
  // { type: 'job_complete', status: 'completed', progress: 100, result: {...} }
};
```

## 🚀 Déploiement

### 1. Déployer les fonctions Edge

```bash
# Déployer generate-media
supabase functions deploy generate-media

# Déployer track-job-status
supabase functions deploy track-job-status
```

### 2. Appliquer la migration

```bash
# Appliquer la migration du trigger
supabase db push

# Ou manuellement
psql -h db.your-project.supabase.co -U postgres -d postgres -f supabase/migrations/20251123_fix_media_generation_flow.sql
```

### 3. Vérifier le déploiement

```bash
# Vérifier que le trigger existe
psql -c "SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_sync_job_to_media';"

# Vérifier que les fonctions sont déployées
supabase functions list
```

## ⚠️ Points d'Attention

### 1. Compatibilité Ascendante

Les anciennes entrées dans la table `jobs` (liée à `job_sets`) ne sont **pas affectées** par ces modifications. Le système de carrousels via le chat continue de fonctionner normalement.

### 2. Doublons

Le trigger vérifie systématiquement si une entrée existe déjà dans `media_generations` avant d'insérer. Cela évite les doublons si le worker et le trigger s'exécutent tous les deux.

### 3. Performance

L'index `idx_media_generations_job_output` a été ajouté pour optimiser les vérifications de doublons. Si vous avez des millions d'entrées, surveillez les performances.

### 4. Logs

Tous les composants loguent abondamment :
- `generate-media` : `[generate-media]`
- `process-job-worker` : `[process-job-worker]`
- Trigger : `RAISE NOTICE` et `RAISE WARNING`

Consultez les logs Supabase pour le débogage.

## 📝 Checklist de Validation

- [ ] La fonction `generate-media` insère dans `job_queue`
- [ ] Le worker `process-job-worker` récupère les jobs depuis `job_queue`
- [ ] Les images générées apparaissent dans `media_generations`
- [ ] Le WebSocket `track-job-status` renvoie les bons statuts
- [ ] Le trigger de synchronisation fonctionne en cas d'échec du worker
- [ ] Les images apparaissent dans la bibliothèque du Studio
- [ ] Aucun doublon n'est créé dans `media_generations`
- [ ] Les logs confirment le bon déroulement du flux

## 🔗 Fichiers Modifiés

1. `supabase/functions/generate-media/index.ts` (corrigé)
2. `supabase/functions/track-job-status/index.ts` (corrigé)
3. `supabase/migrations/20251123_fix_media_generation_flow.sql` (nouveau)

## 📞 Support

En cas de problème :
1. Vérifier les logs Supabase (Dashboard → Logs → Edge Functions)
2. Vérifier les logs PostgreSQL (Dashboard → Database → Logs)
3. Tester manuellement chaque étape du flux
4. Consulter ce document pour la logique attendue

---

**Date de création** : 23 novembre 2024  
**Auteur** : Manus AI  
**Version** : 1.0
