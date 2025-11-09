# Guide de Migration : Ancien Chat → Nouveau Chat Simplifié

## 📊 Comparaison

| Aspect | Ancien Code | Nouveau Code |
|--------|-------------|--------------|
| **Lignes de code** | ~2400 lignes | ~650 lignes |
| **Complexité** | Très élevée | Minimale |
| **Edge functions** | 15+ | 6 essentielles |
| **États** | 20+ | 10 |
| **Dépendances** | Nombreuses | Minimales |
| **Maintenabilité** | Difficile | Facile |

---

## 🚀 Étapes de Migration

### 1. **Backup de l'Ancien Code**

```bash
cd alfie-designer
cp src/components/AlfieChat.tsx src/components/AlfieChat_old_backup.tsx
```

### 2. **Remplacer le Fichier**

```bash
# Copier le nouveau code
cp /chemin/vers/AlfieChat_v2_simplified.tsx src/components/AlfieChat.tsx
```

### 3. **Vérifier les Imports**

Le nouveau code nécessite uniquement :
```typescript
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Send, ImagePlus, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBrandKit } from '@/hooks/useBrandKit';
import { supabase } from '@/lib/supabaseClient';
import { getAuthHeader } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import TextareaAutosize from 'react-textarea-autosize';
import { CreateHeader } from '@/components/create/CreateHeader';
import { QuotaBar } from '@/components/create/QuotaBar';
```

### 4. **Supprimer les Dépendances Inutilisées**

Le nouveau code **ne nécessite plus** :
- ❌ `alfie-chat` (agent IA)
- ❌ `alfie-plan-carousel` (planification)
- ❌ `alfie-classify-intent` (classification IA)
- ❌ `PlanEditor` (éditeur de plan)
- ❌ `BriefForm` (formulaire de brief)
- ❌ `AssetMessage` (composant complexe)
- ❌ `JobPlaceholder` (placeholder de job)
- ❌ `useAlfieCredits` (ancien système de crédits)
- ❌ `useTemplateLibrary` (templates Canva)
- ❌ `useAlfieOptimizations` (cache)
- ❌ `useCarouselSubscription` (subscription complexe)

### 5. **Tester les 3 Flux**

#### A. Test Image
```
User: "Crée-moi une image d'un coucher de soleil 1:1"
Expected: Image générée en ~10s
```

#### B. Test Vidéo
```
User: "Fais-moi une vidéo 9:16 sur le marketing"
Expected: Job lancé, placeholder affiché
```

#### C. Test Carrousel
```
User: "Crée un carrousel de 5 slides sur le SEO"
Expected: Job set créé, suivi en temps réel
```

---

## 🔧 Modifications Nécessaires

### 1. **Ajouter le Suivi en Temps Réel (Optionnel)**

Pour le suivi des vidéos et carrousels, vous pouvez ajouter :

```typescript
// Hook pour le suivi des jobs
const useJobTracking = (jobId: string) => {
  const [status, setStatus] = useState<'processing' | 'completed' | 'failed'>('processing');
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!jobId) return;
    
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('jobs')
        .select('status, progress')
        .eq('id', jobId)
        .single();
      
      if (data) {
        setStatus(data.status);
        setProgress(data.progress || 0);
        
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
        }
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [jobId]);
  
  return { status, progress };
};
```

### 2. **Améliorer l'Affichage des Assets**

Pour afficher les images/vidéos générées avec plus de détails :

```typescript
{message.type === 'image' && message.assetUrl && (
  <div className="space-y-2">
    <p className="text-sm font-medium">{message.content}</p>
    <img
      src={message.assetUrl}
      alt="Generated"
      className="rounded-lg w-full shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
      onClick={() => window.open(message.assetUrl, '_blank')}
    />
    <div className="flex gap-2 justify-between items-center">
      <div className="flex gap-2 text-xs text-muted-foreground">
        <span>💎 {message.metadata?.woofs || 1} Woof</span>
        <span>📐 {message.metadata?.aspectRatio || '1:1'}</span>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => {/* Télécharger */}}>
          ⬇️
        </Button>
        <Button size="sm" variant="ghost" onClick={() => {/* Régénérer */}}>
          🔄
        </Button>
      </div>
    </div>
  </div>
)}
```

---

## ⚠️ Points d'Attention

### 1. **Persistence des Messages**

Le nouveau code **ne persiste pas** les messages en base de données par défaut. Pour ajouter cette fonctionnalité :

```typescript
const addMessage = async (message: Omit<Message, 'id' | 'timestamp'>) => {
  const newMessage = {
    ...message,
    id: crypto.randomUUID(),
    timestamp: new Date()
  };
  
  setMessages(prev => [...prev, newMessage]);
  
  // Persister en base
  if (conversationId) {
    await supabase.from('alfie_messages').insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      type: message.type,
      asset_url: message.assetUrl,
      asset_id: message.assetId,
      metadata: message.metadata
    });
  }
};
```

### 2. **Gestion des Conversations**

Pour ajouter la gestion des conversations (historique) :

```typescript
const [conversationId, setConversationId] = useState<string | null>(null);

useEffect(() => {
  const initConversation = async () => {
    const { data } = await supabase
      .from('alfie_conversations')
      .insert({ user_id: user?.id, title: 'Nouvelle conversation' })
      .select('id')
      .single();
    
    if (data) {
      setConversationId(data.id);
    }
  };
  
  initConversation();
}, [user]);
```

### 3. **Suivi des Carrousels**

Pour le suivi en temps réel des carrousels, utilisez `useCarouselSubscription` :

```typescript
import { useCarouselSubscription } from '@/hooks/useCarouselSubscription';

const { items: carouselItems, done: carouselDone } = useCarouselSubscription(
  activeJobSetId,
  carouselTotal
);

// Mettre à jour le message de suivi
useEffect(() => {
  if (carouselDone > 0 && carouselTotal > 0) {
    setMessages(prev => prev.map(msg => 
      msg.type === 'carousel' && msg.metadata?.jobSetId === activeJobSetId
        ? { ...msg, content: `⏳ Carrousel en cours...\n\n${carouselDone}/${carouselTotal} slides générées` }
        : msg
    ));
  }
}, [carouselDone, carouselTotal, activeJobSetId]);
```

---

## 📦 Fichiers à Conserver

### Composants UI (déjà améliorés)
- ✅ `CreateHeader.tsx`
- ✅ `QuotaBar.tsx`
- ✅ `ChatComposer.tsx` (si vous préférez le garder séparé)

### Hooks
- ✅ `useAuth.tsx`
- ✅ `useBrandKit.tsx`
- ⚠️ `useCarouselSubscription.tsx` (si vous voulez le suivi en temps réel)

### Edge Functions
- ✅ `alfie-render-image`
- ✅ `generate-video`
- ✅ `create-job-set`
- ✅ `process-job-worker`
- ✅ `get-quota`
- ✅ `alfie-consume-woofs`
- ✅ `alfie-consume-visuals`
- ✅ `alfie-refund-woofs`

---

## 🎯 Avantages du Nouveau Code

1. **Simplicité** : 650 lignes vs 2400 lignes
2. **Clarté** : Chaque fonction fait une seule chose
3. **Maintenabilité** : Facile à débugger et modifier
4. **Performance** : Moins d'appels API inutiles
5. **Robustesse** : Gestion d'erreurs centralisée
6. **Évolutivité** : Facile d'ajouter de nouveaux types

---

## 🔄 Rollback (Si Nécessaire)

Si vous rencontrez des problèmes, vous pouvez revenir à l'ancien code :

```bash
cp src/components/AlfieChat_old_backup.tsx src/components/AlfieChat.tsx
```

---

## 📝 Checklist de Migration

- [ ] Backup de l'ancien code
- [ ] Remplacement du fichier
- [ ] Vérification des imports
- [ ] Suppression des dépendances inutilisées
- [ ] Test de génération d'image
- [ ] Test de génération de vidéo
- [ ] Test de génération de carrousel
- [ ] Vérification des quotas
- [ ] Test de l'upload d'image
- [ ] Test du nettoyage du chat
- [ ] Vérification de l'UI (bulles, avatars, etc.)
- [ ] Test en production

---

## 🆘 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs de la console
2. Vérifiez les edge functions dans Supabase
3. Vérifiez les quotas de la marque active
4. Contactez le support si nécessaire

---

**Date de migration :** 2025-01-XX  
**Auteur :** Manus AI Agent  
**Version :** 2.0 (Simplifié)
