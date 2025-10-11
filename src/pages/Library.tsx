import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, Trash2, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLibraryAssets } from '@/hooks/useLibraryAssets';
import { AssetCard } from '@/components/library/AssetCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { VideoDiagnostic } from '@/components/VideoDiagnostic';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Library() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'images' | 'videos'>('images');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const { 
    assets, 
    loading, 
    deleteAsset, 
    downloadAsset,
    downloadMultiple,
    cleanupProcessingVideos
  } = useLibraryAssets(user?.id, activeTab);

  // Auto cleanup when switching to videos tab
  useEffect(() => {
    if (activeTab === 'videos') {
      cleanupProcessingVideos();
    }
  }, [activeTab]);

  const filteredAssets = assets.filter(asset =>
    !searchQuery || 
    asset.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.engine?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAsset = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(filteredAssets.map(a => a.id));
    }
  };

  const handleDownloadSelected = async () => {
    await downloadMultiple(selectedAssets);
    setSelectedAssets([]);
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedAssets) {
      await deleteAsset(id);
    }
    setSelectedAssets([]);
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const handleDebugGenerate = async () => {
    if (!user?.id) {
      toast.error('Vous devez être connecté.');
      return;
    }
    const prompt = 'Golden retriever in a playful Halloween scene, cinematic';
    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { prompt, aspectRatio: '9:16' }
      });
      if (error || data?.error) {
        const msg = (error as any)?.message || data?.error || 'Erreur inconnue';
        toast.error(`Échec génération: ${msg}`);
        return;
      }
      const predictionId = typeof data?.id === 'string' && data.id.trim().length > 0
        ? data.id.trim()
        : (typeof data?.predictionId === 'string' && data.predictionId.trim().length > 0
          ? data.predictionId.trim()
          : undefined);
      const providerCandidate = (() => {
        if (typeof data?.provider === 'string' && data.provider.trim().length > 0) {
          return data.provider.trim();
        }
        if (typeof data?.engine === 'string' && data.engine.trim().length > 0) {
          return data.engine.trim();
        }
        const metadataProvider = typeof data?.metadata?.provider === 'string' && data.metadata.provider.trim().length > 0
          ? data.metadata.provider.trim()
          : undefined;
        if (metadataProvider) {
          return metadataProvider;
        }
        return undefined;
      })();
      const providerRaw = providerCandidate ?? undefined;
      const provider = providerRaw ? providerRaw.toLowerCase() : undefined;
      const jobId = typeof data?.jobId === 'string' && data.jobId.trim().length > 0 ? data.jobId : undefined;
      const jobShortId = typeof data?.jobShortId === 'string' && data.jobShortId.trim().length > 0 ? data.jobShortId : undefined;

      if (!predictionId || !provider) {
        toast.error("Réponse invalide du backend (identifiant ou fournisseur manquant). Vérifie les secrets Lovable Cloud.");
        return;
      }

      if (!jobId) {
        toast.info('Génération vidéo lancée (suivi job indisponible)');
      }
      await supabase
        .from('media_generations')
        .insert({
          user_id: user.id,
          type: 'video',
          engine: provider,
          status: 'processing',
          prompt,
          woofs: 1,
          output_url: '',
          job_id: jobId ?? null,
          metadata: { predictionId, provider: providerRaw ?? provider, jobId: jobId ?? null, jobShortId: jobShortId ?? null }
        });
      toast.success(`Génération vidéo lancée (${provider})`);
    } catch (e: any) {
      console.error('Debug generate error:', e);
      toast.error(e.message || 'Erreur lors du lancement');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          📚 Bibliothèque
        </h1>
        <p className="text-muted-foreground">
          Toutes vos créations en un seul endroit. Stockage 30 jours.
        </p>
      </div>

      {/* Video Diagnostic */}
      <VideoDiagnostic />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'images' | 'videos')}>
        <TabsList>
          <TabsTrigger value="images">🖼️ Images</TabsTrigger>
          <TabsTrigger value="videos">🎬 Vidéos</TabsTrigger>
        </TabsList>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {activeTab === 'videos' && (
            <>
              <Button 
                size="sm" 
                variant="outline"
                onClick={cleanupProcessingVideos}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Nettoyer les vidéos bloquées
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDebugGenerate}
              >
                Génération vidéo (debug)
              </Button>
            </>
          )}

          {selectedAssets.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedAssets.length} sélectionné(s)</Badge>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleDownloadSelected}
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </div>
          )}

          {filteredAssets.length > 0 && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleSelectAll}
            >
              {selectedAssets.length === filteredAssets.length ? 'Désélectionner tout' : 'Tout sélectionner'}
            </Button>
          )}
        </div>

        {/* Images Tab */}
        <TabsContent value="images" className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune image pour l'instant.</p>
              <p className="text-sm">Générez depuis le chat, elles arrivent ici automatiquement.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAssets.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  selected={selectedAssets.includes(asset.id)}
                  onSelect={() => handleSelectAsset(asset.id)}
                  onDownload={() => downloadAsset(asset.id)}
                  onDelete={() => deleteAsset(asset.id)}
                  daysUntilExpiry={getDaysUntilExpiry(asset.expires_at)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-lg" />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune vidéo pour l'instant.</p>
              <p className="text-sm">Générez depuis le chat, elles arrivent ici automatiquement.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  selected={selectedAssets.includes(asset.id)}
                  onSelect={() => handleSelectAsset(asset.id)}
                  onDownload={() => downloadAsset(asset.id)}
                  onDelete={() => deleteAsset(asset.id)}
                  daysUntilExpiry={getDaysUntilExpiry(asset.expires_at)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
