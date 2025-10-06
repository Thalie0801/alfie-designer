# Optimisations Alfie - Réduction des coûts IA

## 🎯 Objectifs
- Réduire les appels IA inutiles (économie de coûts)
- Améliorer les performances avec le cache
- Protéger la marge avec des quotas par plan
- Faciliter le changement de modèle IA

---

## ✅ Implémentations

### 1. 💾 Système de cache (alfie_cache)

**Table créée:** `alfie_cache`
- Stocke les réponses fréquentes (browse_templates, brandkit_info, etc.)
- Hash du prompt pour lookup rapide
- Compteur d'usage pour identifier les patterns

**Usage:**
```typescript
import { useAlfieOptimizations } from '@/hooks/useAlfieOptimizations';

const { getCachedResponse, setCachedResponse } = useAlfieOptimizations();

// Avant l'appel IA
const cached = await getCachedResponse(prompt, 'browse_templates');
if (cached) {
  // Utiliser la réponse cachée
}

// Après l'appel IA
await setCachedResponse(prompt, 'browse_templates', response);
```

---

### 2. 🧠 Intent Detection (Short Calls)

**Fichier:** `src/utils/alfieIntentDetector.ts`

Détecte les intentions simples AVANT d'appeler l'IA :
- `open_canva` → Gestion locale
- `show_brandkit` → Lecture directe du state
- `check_credits` → Affichage du solde sans IA
- `browse_templates` → Détection de catégorie (social, marketing, ecommerce)

**Avantages:**
- Économie de ~30% d'appels IA sur les actions simples
- Réponse instantanée (UX améliorée)
- Transparent pour l'utilisateur

**Exemple de détection:**
```typescript
"Montre-moi mes couleurs" → Intent: show_brandkit (confidence: 0.9)
"Templates Instagram" → Intent: browse_templates (params: {category: 'social_media'})
```

---

### 3. 🚦 Rate Limiting par plan

**Colonnes ajoutées dans `profiles`:**
- `alfie_requests_this_month` (INTEGER)
- `alfie_requests_reset_date` (TIMESTAMP)

**Quotas définis:**
```typescript
const MONTHLY_QUOTAS = {
  none: 10,      // Plan gratuit
  starter: 100,  // Plan Starter
  studio: 300,   // Plan Studio
  pro: 500,      // Plan Pro
};
```

**Fonction DB:** `increment_alfie_requests(user_id)`
- Auto-reset mensuel
- Compteur incrémenté à chaque requête IA

**UI:**
- Barre de progression du quota dans AlfieChat
- Alerte à 80% et 100%
- Message explicatif si quota dépassé

---

### 4. 🔄 Configuration flexible du modèle IA

**Fichier:** `src/config/alfieAI.ts`

Permet de switcher facilement entre :
- **Gemini** (google/gemini-2.5-flash) - Actuel, ~0.05€/req
- **OpenAI** (openai/gpt-5-mini) - ~0.15€/req
- **Mistral** (mistral/mistral-medium) - ~0.08€/req

**Switch de modèle:**
```typescript
import { switchAIProvider } from '@/config/alfieAI';

// Changer pour OpenAI
const newConfig = switchAIProvider('openai');
// Utiliser newConfig.model et newConfig.endpoint
```

**Variable d'environnement (optionnel):**
```bash
ALFIE_AI_MODEL=google/gemini-2.5-flash
```

---

## 📊 Impact attendu

### Réduction des coûts IA
- **Cache:** ~20-30% d'économie sur les requêtes répétitives
- **Intent Detection:** ~30-40% d'économie sur actions simples
- **Rate Limiting:** Protection contre usage abusif

### Exemples concrets
**Avant optimisation:**
- 1000 requêtes/mois × 0.05€ = **50€/mois**

**Après optimisation:**
- Cache hits: 300 (0€)
- Intent local: 400 (0€)
- Requêtes IA: 300 × 0.05€ = **15€/mois**

**Économie: 70%** 🎉

---

## 🔧 Configuration recommandée

### Pour tester les coûts
1. Monitorer `alfie_cache.usage_count` pour voir les patterns
2. Vérifier les logs de détection d'intent
3. Ajuster les quotas selon les plans

### Pour changer de modèle IA
1. Éditer `src/config/alfieAI.ts` → `ACTIVE_AI_CONFIG`
2. Ou définir `ALFIE_AI_MODEL` dans Supabase secrets
3. Redéployer l'edge function `alfie-chat`

### Pour ajuster les quotas
Éditer `src/hooks/useAlfieOptimizations.tsx`:
```typescript
const MONTHLY_QUOTAS = {
  none: 20,    // Augmenter si besoin
  pro: 1000,   // Plus généreux
  // etc.
};
```

---

## 🎨 Expérience utilisateur

L'utilisateur voit :
- ✅ Compteur de requêtes Alfie (X/Y requêtes)
- ✅ Barre de progression du quota
- ✅ Alertes quand proche de la limite
- ✅ Message clair si quota dépassé
- ✅ Réponses instantanées sur cache hits (toast "🚀")

L'utilisateur ne voit PAS :
- ❌ Noms techniques des modèles (Nano-Banana, Gemini, etc.)
- ❌ Détails d'implémentation du cache
- ❌ Logique d'intent detection

---

## 📈 Monitoring conseillé

### Métriques à suivre
1. **Cache hit rate**: `SELECT prompt_type, AVG(usage_count) FROM alfie_cache GROUP BY prompt_type`
2. **Quota usage par plan**: `SELECT plan, AVG(alfie_requests_this_month) FROM profiles GROUP BY plan`
3. **Intent detection success**: Logs frontend (console)

### Optimisations futures
- [ ] Webhook pour vider le cache mensuel (garder que top 20%)
- [ ] Machine learning pour améliorer l'intent detection
- [ ] A/B testing entre Gemini/OpenAI pour comparer coûts réels
- [ ] Dashboard admin pour voir les coûts en temps réel

---

## 🚀 Déploiement

Toutes les optimisations sont déjà déployées ! Les changements incluent :

**Backend (Supabase):**
- Table `alfie_cache`
- Fonction `increment_alfie_requests`
- Colonnes de rate limiting dans `profiles`

**Frontend:**
- Hook `useAlfieOptimizations`
- Détecteur d'intent
- Config flexible des modèles
- UI avec quota

**Edge Functions:**
- Variable `ALFIE_AI_MODEL` dans alfie-chat
- Support multi-providers prêt

---

## 💡 Conseils

### Pour maximiser les économies
1. Encourager les utilisateurs à utiliser le cache (réponses rapides)
2. Améliorer les patterns d'intent au fil du temps
3. Monitorer les abus (utilisateurs dépassant systématiquement)

### Pour la flexibilité
1. Tester différents providers sur un petit % d'utilisateurs
2. Comparer les coûts réels vs perfs
3. Ajuster selon les retours utilisateurs

---

## 🐾 Alfie te remercie ! 

Ces optimisations permettent à Alfie de rester **performant, économique et évolutif** tout en offrant la meilleure expérience possible aux utilisateurs ! ✨
