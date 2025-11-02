import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Send, ImagePlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBrandKit } from '@/hooks/useBrandKit';
import { supabase } from '@/integrations/supabase/client';
import { getAuthHeader } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import TextareaAutosize from 'react-textarea-autosize';
import { CreateHeader } from '@/components/create/CreateHeader';
import { QuotaBar } from '@/components/create/QuotaBar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

// ======
// TYPES
// ======

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image' | 'video' | 'carousel';
  assetUrl?: string;
  assetId?: string;
  metadata?: any;
  timestamp: Date;
}

type IntentType = 'image' | 'video' | 'carousel' | 'unknown';

// ======
// COMPOSANT PRINCIPAL
// ======

export function AlfieChat() {
  const { user } = useAuth();
  const { activeBrandId } = useBrandKit();
  
  // États minimaux (6 au lieu de 15+)
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'assistant',
    content: '👋 Salut ! Je suis Alfie, ton assistant créatif.\n\nJe peux générer :\n• **Images** (1 Woof)\n• **Vidéos** (1-3 Woofs)\n• **Carrousels** (1 Visuel/slide)\n\nQu\'est-ce qu\'on crée aujourd\'hui ?',
    type: 'text',
    timestamp: new Date()
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  // Tracking carrousel uniquement
  const [carouselProgress, setCarouselProgress] = useState({ done: 0, total: 0 });
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPollingRef = useRef<Record<string, NodeJS.Timeout>>({});
  const carouselChannelRef = useRef<any>(null);
  
  // ======
  // UTILITAIRES
  // ======
  
  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>): string => {
    const id = crypto.randomUUID();
    setMessages(prev => [...prev, {
      ...message,
      id,
      timestamp: new Date()
    }]);
    return id;
  };
  
  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // ======
  // DÉTECTION D'INTENTION LOCALE
  // ======
  
  const detectIntent = (prompt: string): IntentType => {
    const lower = prompt.toLowerCase();
    
    // Priorité 1 : Carrousel
    if (/(carrousel|carousel|slides|série)/i.test(lower)) {
      return 'carousel';
    }
    
    // Priorité 2 : Vidéo
    if (/(vidéo|video|reel|short|story)/i.test(lower)) {
      return 'video';
    }
    
    // Priorité 3 : Image
    if (/(image|visuel|photo|illustration|cover)/i.test(lower)) {
      return 'image';
    }
    
    return 'unknown';
  };
  
  const extractCount = (prompt: string): number => {
    const match = prompt.match(/(\d+)\s*(slides?|visuels?|images?)/i);
    return match ? parseInt(match[1]) : 5;
  };
  
  const detectAspectRatio = (prompt: string): string => {
    if (/9:16|story|vertical|tiktok|reels/i.test(prompt)) return '9:16';
    if (/16:9|youtube|horizontal|paysage/i.test(prompt)) return '16:9';
    if (/4:5|instagram|carrousel/i.test(prompt)) return '4:5';
    if (/1:1|carré|square/i.test(prompt)) return '1:1';
    return '1:1';
  };
  
  // ======
  // GESTION DES QUOTAS
  // ======
  
  const checkAndConsumeQuota = async (
    type: 'woofs' | 'visuals',
    amount: number
  ): Promise<boolean> => {
    if (!activeBrandId) {
      toast.error('Aucune marque active. Sélectionne une marque d\'abord !');
      return false;
    }
    
    try {
      const headers = await getAuthHeader();
      
      // 1. Vérifier le quota
      const { data: quota, error: quotaError } = await supabase.functions.invoke('get-quota', {
        body: { brand_id: activeBrandId },
        headers
      });
      
      if (quotaError || !quota) {
        toast.error('Impossible de vérifier les quotas');
        return false;
      }
      
      const remaining = type === 'woofs' ? quota.woofs_remaining : quota.visuals_remaining;
      
      if (remaining < amount) {
        toast.error(`Quota insuffisant. Il te reste ${remaining} ${type}.`);
        addMessage({
          role: 'assistant',
          content: `❌ Quota insuffisant.\n\nIl te reste **${remaining} ${type}** mais tu en demandes **${amount}**.\n\nConsulte ton quota dans ton profil ou upgrade ton plan.`,
          type: 'text'
        });
        return false;
      }
      
      // 2. Consommer le quota
      const endpoint = type === 'woofs' ? 'alfie-consume-woofs' : 'alfie-consume-visuals';
      const { error: consumeError } = await supabase.functions.invoke(endpoint, {
        body: { 
          [type === 'woofs' ? 'cost_woofs' : 'cost_visuals']: amount,
          brand_id: activeBrandId 
        },
        headers
      });
      
      if (consumeError) {
        toast.error('Impossible de consommer le quota');
        return false;
      }
      
      return true;
    } catch (error: any) {
      console.error('[Quota] Error:', error);
      toast.error('Erreur lors de la vérification des quotas');
      return false;
    }
  };
  
  const refundWoofs = async (amount: number) => {
    if (!activeBrandId) return;
    try {
      const headers = await getAuthHeader();
      await supabase.functions.invoke('alfie-refund-woofs', {
        body: { amount, brand_id: activeBrandId },
        headers
      });
      console.log(`[Refund] ${amount} Woofs remboursés`);
    } catch (error) {
      console.error('[Refund] Error:', error);
    }
  };
  
  const refundVisuals = async (amount: number) => {
    if (!activeBrandId) return;
    try {
      await supabase.rpc('refund_brand_quotas', {
        p_brand_id: activeBrandId,
        p_visuals_count: amount
      });
      console.log(`[Refund] ${amount} Visuels remboursés`);
    } catch (error) {
      console.error('[Refund] Error:', error);
    }
  };
  
  // ======
  // GÉNÉRATION D'IMAGES
  // ======
  
  const mapAspectRatio = (ratio: string): string => {
    const mapping: Record<string, string> = {
      '1:1': '1024x1024',
      '4:5': '1024x1280',
      '9:16': '1024x1820',
      '16:9': '1820x1024',
      '3:4': '1024x1365',
      '4:3': '1365x1024'
    };
    return mapping[ratio] || '1024x1024';
  };
  
  const generateImage = async (prompt: string, aspectRatio: string) => {
    const woofCost = 1;
    
    // 1. Vérifier et consommer quota
    const quotaOk = await checkAndConsumeQuota('woofs', woofCost);
    if (!quotaOk) return;
    
    // 2. Message de génération
    addMessage({
      role: 'assistant',
      content: '🎨 Génération de ton image en cours...',
      type: 'text'
    });
    
    try {
      const headers = await getAuthHeader();
      
      // 3. Appeler alfie-render-image
      const { data, error } = await supabase.functions.invoke('alfie-render-image', {
        body: {
          provider: 'gemini-nano',
          prompt: uploadedImage ? `[Image Référence: ${uploadedImage}] ${prompt}` : prompt,
          format: mapAspectRatio(aspectRatio),
          brand_id: activeBrandId,
          cost_woofs: woofCost
        },
        headers
      });
      
      if (error) throw error;
      
      if (!data?.ok || !data?.data?.image_urls?.[0]) {
        throw new Error(data?.error || 'Aucune image générée');
      }
      
      // 4. Afficher l'image
      addMessage({
        role: 'assistant',
        content: '✅ Image générée avec succès !',
        type: 'image',
        assetUrl: data.data.image_urls[0],
        assetId: data.data.generation_id
      });
      
      toast.success('Image générée !');
      
    } catch (error: any) {
      console.error('[Image] Error:', error);
      await refundWoofs(woofCost);
      addMessage({
        role: 'assistant',
        content: `❌ Erreur : ${error.message}`,
        type: 'text'
      });
      toast.error('Échec de la génération d\'image');
    }
  };
  
  // ======
  // GÉNÉRATION DE VIDÉOS
  // ======
  
  const generateVideo = async (prompt: string, aspectRatio: string) => {
    // Déterminer le coût en Woofs (1-3 selon durée détectée)
    const duration = prompt.match(/(\d+)\s*s/)?.[1];
    let woofCost = 1;
    if (duration) {
      const seconds = parseInt(duration);
      if (seconds <= 8) woofCost = 1;
      else if (seconds <= 15) woofCost = 2;
      else woofCost = 3;
    }
    
    // 1. Vérifier et consommer quota
    const quotaOk = await checkAndConsumeQuota('woofs', woofCost);
    if (!quotaOk) return;
    
    // 2. Message de génération
    addMessage({
      role: 'assistant',
      content: `🎬 Génération vidéo lancée (${woofCost} Woofs)...`,
      type: 'text'
    });
    
    try {
      const headers = await getAuthHeader();
      
      // 3. Appeler generate-video
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          prompt: uploadedImage ? `[Image Référence: ${uploadedImage}] ${prompt}` : prompt,
          aspectRatio,
          brandId: activeBrandId,
          woofCost
        },
        headers
      });
      
      if (error) throw error;
      
      if (!data?.jobId) {
        throw new Error('Aucun jobId reçu');
      }
      
      // 4. Afficher placeholder et démarrer le polling
      const messageId = addMessage({
        role: 'assistant',
        content: '⏳ Vidéo en cours de génération...',
        type: 'video',
        metadata: { jobId: data.jobId, status: 'processing' }
      });
      
      pollVideoStatus(data.jobId, messageId, woofCost);
      
    } catch (error: any) {
      console.error('[Video] Error:', error);
      await refundWoofs(woofCost);
      addMessage({
        role: 'assistant',
        content: `❌ Erreur : ${error.message}`,
        type: 'text'
      });
      toast.error('Échec de la génération de vidéo');
    }
  };
  
  const pollVideoStatus = (jobId: string, messageId: string, woofCost: number) => {
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('media_generations')
          .select('status, output_url')
          .eq('id', jobId)
          .single();
        
        if (data?.status === 'completed') {
          clearInterval(interval);
          delete videoPollingRef.current[jobId];
          
          updateMessage(messageId, {
            content: '✅ Vidéo générée !',
            assetUrl: data.output_url,
            metadata: { jobId, status: 'completed' }
          });
          
          toast.success('Vidéo générée avec succès !');
        } else if (data?.status === 'failed') {
          clearInterval(interval);
          delete videoPollingRef.current[jobId];
          
          updateMessage(messageId, {
            content: '❌ Échec de la génération',
            metadata: { jobId, status: 'failed' }
          });
          
          // Rembourser les Woofs
          await refundWoofs(woofCost);
          toast.error('Échec de la génération de vidéo');
        }
      } catch (error) {
        console.error('[Poll] Error:', error);
      }
    }, 5000);
    
    videoPollingRef.current[jobId] = interval;
  };
  
  // ======
  // GÉNÉRATION DE CARROUSELS (NOUVEAU FLUX : PLAN TEXTUEL + BOUCLE IMAGE)
  // ======
  
  export interface CarouselSlide {
	    title: string;
	    text: string;
	    imagePrompt: string;
	  }
	  
	  const generateCarouselPlan = async (prompt: string, count: number): Promise<CarouselSlide[] | null> => {
    // 1. Appel à l'IA pour générer le plan textuel (APPEL SUPABASE)
    addMessage({
      role: 'assistant',
      content: `🧠 Alfie est en train de générer le plan textuel de votre carrousel de ${count} slides...`,
      type: 'text'
    });

    try {
      const headers = await getAuthHeader();
      const { data, error } = await supabase.functions.invoke('alfie-plan-carousel', {
        body: { prompt, count },
        headers
      });

      if (error) throw error;

      // Assurez-vous que la réponse est un tableau de CarouselSlide
      if (!data || !Array.isArray(data)) {
        throw new Error('Réponse invalide de alfie-plan-carousel');
      }

      return data as CarouselSlide[];

    } catch (error: any) {
      console.error('[Carousel Plan] Error:', error);
      toast.error(`Échec de la planification : ${error.message}`);
      addMessage({
        role: 'assistant',
        content: `❌ Erreur de planification : ${JSON.stringify(error)}`,
        type: 'text'
      });
      return null;
    }
  };    const plan = await generateCarouselPlan(prompt, count);
    if (!plan) return;
    
    // 2. Afficher le plan et demander validation
    const planContent = plan.map((slide, index) => 
      `**Slide ${index + 1}**\n- Titre: ${slide.title}\n- Texte: ${slide.text}\n- Prompt Image: *${slide.imagePrompt}*`
    ).join('\n\n');
    
    addMessage({
      role: 'assistant',
      content: `Voici le plan proposé pour votre carrousel de ${count} slides :\n\n${planContent}\n\n**Validez-vous ce plan pour lancer la génération des images ?** (Répondez 'oui' ou 'non')`,
      type: 'text',
      metadata: {
        awaitingValidation: true,
        action: 'carousel_plan_validation',
        plan,
        aspectRatio
      }
    });
  };
  
  // L'ancienne fonction generateCarousel est supprimée et remplacée par la logique de validation dans handleSend
  
  const subscribeToCarousel = (jobSetId: string, total: number) => {
    // Nettoyer l'ancien canal si présent
    if (carouselChannelRef.current) {
      supabase.removeChannel(carouselChannelRef.current);
    }
    
    const channel = supabase
      .channel(`carousel-${jobSetId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `job_set_id=eq.${jobSetId}`
      }, () => {
        // Recompter les jobs terminés
        updateCarouselProgress(jobSetId, total);
      })
      .subscribe();
    
    carouselChannelRef.current = channel;
    
    // Polling de secours toutes les 10s
    const pollInterval = setInterval(async () => {
      await updateCarouselProgress(jobSetId, total);
      
      // Arrêter le polling si terminé
      if (carouselProgress.done >= total) {
        clearInterval(pollInterval);
      }
    }, 10000);
  };
  
  const updateCarouselProgress = async (jobSetId: string, total: number) => {
    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('status')
        .eq('job_set_id', jobSetId);
      
      if (!jobs) return;
      
      const done = jobs.filter(j => j.status === 'succeeded' || j.status === 'completed').length;
      setCarouselProgress({ done, total });
      
      // Mettre à jour le message de progression
      setMessages(prev => prev.map(m => {
        if (m.type === 'carousel' && m.metadata?.jobSetId === jobSetId) {
          return {
            ...m,
            content: done >= total 
              ? `✅ Carrousel terminé (${done}/${total}) !`
              : `⏳ Génération en cours (${done}/${total})...`,
            metadata: { ...m.metadata, done }
          };
        }
        return m;
      }));
      
      // Si terminé, charger les assets
      if (done >= total) {
        const { data: assets } = await supabase
          .from('assets')
          .select('id, storage_key')
          .eq('job_set_id', jobSetId)
          .order('index_in_set', { ascending: true });
        
        if (assets && assets.length > 0) {
          // Afficher les slides générées
          addMessage({
            role: 'assistant',
            content: `✅ ${assets.length} slides générées avec succès !`,
            type: 'text',
            metadata: { 
              jobSetId, 
              assetIds: assets.map(a => a.id),
              assetUrls: assets.map(a => {
                const { data } = supabase.storage.from('media-generations').getPublicUrl(a.storage_key);
                return data.publicUrl;
              })
            }
          });
          
          toast.success(`Carrousel terminé ! ${assets.length} slides générées.`);
        }
      }
    } catch (error) {
      console.error('[Carousel] Progress update error:', error);
    }
  };
  
  // Cleanup des subscriptions et polling
  useEffect(() => {
    return () => {
      // Nettoyer le polling des vidéos
      Object.values(videoPollingRef.current).forEach(clearInterval);
      
      // Nettoyer le canal carrousel
      if (carouselChannelRef.current) {
        supabase.removeChannel(carouselChannelRef.current);
      }
    };
  }, []);
  
  // ======
  // HANDLER PRINCIPAL
  // ======
  
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    if (!activeBrandId) {
      toast.error('Sélectionne une marque d\'abord !');
      return;
    }
    
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    
    // 1. Ajouter message utilisateur
    addMessage({
      role: 'user',
      content: userMessage,
      type: 'text'
    });
    
    try {
      // 2. Vérifier si on est en attente de validation de plan de carrousel
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.metadata?.awaitingValidation && lastMessage.metadata.action === 'carousel_plan_validation') {
        if (userMessage.toLowerCase().includes('oui') || userMessage.toLowerCase().includes('ok')) {
          
          const { plan, aspectRatio } = lastMessage.metadata;
          const count = plan.length;
          
          // 2.1. Vérifier et consommer quota (count visuels)
          const quotaOk = await checkAndConsumeQuota('visuals', count);
          if (!quotaOk) {
            setIsLoading(false);
            return;
          }
          
          addMessage({
            role: 'assistant',
            content: `✅ Plan validé ! Lancement de la génération des ${count} images...`,
            type: 'text'
          });
          
          // 2.2. Lancer la boucle de génération d'images (le nouveau flux)
          for (let i = 0; i < count; i++) {
            const slide = plan[i];
            addMessage({
              role: 'assistant',
              content: `🎨 Génération de la slide ${i + 1}/${count} : *${slide.title}*`,
              type: 'text'
            });
            
            // Appeler la fonction generateImage existante
            await generateImage(slide.imagePrompt, aspectRatio);
          }
          
          addMessage({
            role: 'assistant',
            content: `🎉 Carrousel de ${count} slides terminé !`,
            type: 'text'
          });
          
          return;
        } else if (userMessage.toLowerCase().includes('non')) {
          addMessage({
            role: 'assistant',
            content: '❌ Plan annulé. Veuillez reformuler votre demande de carrousel.',
            type: 'text'
          });
          return;
        }
      }
      
      // 3. Détecter l'intention
      const intent = detectIntent(userMessage);
      
      switch (intent) {
        case 'image': {
          const aspectRatio = detectAspectRatio(userMessage);
          await generateImage(userMessage, aspectRatio);
          break;
        }
        
        case 'video': {
          const aspectRatio = detectAspectRatio(userMessage);
          await generateVideo(userMessage, aspectRatio);
          break;
        }
        
        case 'carousel': {
          const count = extractCount(userMessage);
          const aspectRatio = detectAspectRatio(userMessage);
          await generateCarousel(userMessage, count, aspectRatio);
          break;
        }
        
        default:
          addMessage({
            role: 'assistant',
            content: "Je ne suis pas sûr de comprendre. Tu veux créer une **image**, une **vidéo** ou un **carrousel** ? 🤔",
            type: 'text'
          });
      }
    } catch (error) {
      console.error('Error in handleSend:', error);
      addMessage({
        role: 'assistant',
        content: '❌ Une erreur inattendue est survenue. Veuillez réessayer.',
        type: 'text'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // ======
  // UPLOAD D'IMAGE
  // ======
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        toast.success('Image uploadée ! Décris ce que tu veux en faire.');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('[Upload] Error:', error);
      toast.error('Erreur lors de l\'upload');
    }
  };
  
  // ======
  // RENDU
  // ======
  
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <CreateHeader />
      
      {/* Quota Bar */}
      {activeBrandId && <QuotaBar activeBrandId={activeBrandId} />}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <Avatar className="h-8 w-8 border-2 border-primary">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  🐾
                </AvatarFallback>
              </Avatar>
            )}
            
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {/* Message texte */}
              {(!message.type || message.type === 'text') && (
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              )}
              
              {/* Message image */}
              {message.type === 'image' && message.assetUrl && (
                <div className="space-y-2">
                  <p className="text-sm">{message.content}</p>
                  <img
                    src={message.assetUrl}
                    alt="Generated"
                    className="rounded-lg w-full"
                  />
                </div>
              )}
              
              {/* Message vidéo */}
              {message.type === 'video' && (
                <div className="space-y-2">
                  <p className="text-sm">{message.content}</p>
                  {message.assetUrl && (
                    <video
                      src={message.assetUrl}
                      controls
                      className="rounded-lg w-full"
                    />
                  )}
                  {message.metadata?.status === 'processing' && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
              )}
              
              {/* Message carrousel */}
              {message.type === 'carousel' && (
                <div className="space-y-2">
                  <p className="text-sm">{message.content}</p>
                  {message.metadata?.total && (
                    <Progress 
                      value={(message.metadata.done / message.metadata.total) * 100} 
                      className="w-full"
                    />
                  )}
                  {message.metadata?.assetUrls && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {message.metadata.assetUrls.map((url: string, i: number) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Slide ${i + 1}`}
                          className="rounded-lg w-full"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {message.role === 'user' && (
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Composer */}
      <div className="border-t bg-background p-4">
        {uploadedImage && (
          <div className="mb-2 relative inline-block">
            <img
              src={uploadedImage}
              alt="Upload preview"
              className="h-20 rounded-lg border"
            />
            <Button
              size="sm"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={() => setUploadedImage(null)}
            >
              ×
            </Button>
          </div>
        )}
        
        <div className="flex gap-2 items-end">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileUpload}
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          
          <TextareaAutosize
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Décris ce que tu veux créer..."
            className="flex-1 resize-none rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            minRows={1}
            maxRows={5}
            disabled={isLoading}
          />
          
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
