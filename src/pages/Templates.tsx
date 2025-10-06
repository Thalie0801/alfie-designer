import { useState, useEffect } from 'react';
import { AppLayoutWithSidebar } from '@/components/AppLayoutWithSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink, Plus, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CanvaDesign {
  id: string;
  title: string;
  image_url: string;
  canva_url: string;
  description: string | null;
  category: string | null;
  created_at: string;
}

export default function Templates() {
  const [designs, setDesigns] = useState<CanvaDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [category, setCategory] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadDesigns();
  }, []);

  const loadDesigns = async () => {
    try {
      const { data, error } = await supabase
        .from('canva_designs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDesigns(data || []);
    } catch (error) {
      console.error('Error loading designs:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les designs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    if (!newUrl.trim()) {
      toast({
        title: 'URL requise',
        description: 'Veuillez entrer une URL Canva',
        variant: 'destructive',
      });
      return;
    }

    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-canva', {
        body: { url: newUrl, category },
      });

      if (error) throw error;

      toast({
        title: 'Design ajouté',
        description: 'Le design a été ajouté au catalogue',
      });

      setNewUrl('');
      setCategory('');
      loadDesigns();
    } catch (error) {
      console.error('Scraping error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de scraper ce design',
        variant: 'destructive',
      });
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="gradient-subtle rounded-2xl p-6 border-2 border-primary/20 shadow-medium">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-primary to-secondary p-3 rounded-xl shadow-glow">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Catalogue Canva
          </h1>
        </div>
        <p className="text-muted-foreground">
          Collection de designs Canva pour t'inspirer 🎨
        </p>
      </div>

      {/* Add Design Form */}
      <Card className="shadow-strong border-2 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Input
                placeholder="URL Canva (https://www.canva.com/design/...)"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="flex-1"
              />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hero">Hero</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                  <SelectItem value="insight">Insight</SelectItem>
                  <SelectItem value="reel">Reel</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleScrape} disabled={scraping}>
                <Plus className="h-4 w-4 mr-2" />
                {scraping ? 'Ajout...' : 'Ajouter'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Ajoute l'URL publique d'un design Canva pour l'ajouter au catalogue
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Designs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-[4/3] bg-muted" />
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : designs.length === 0 ? (
        <Card className="p-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun design pour le moment</h3>
          <p className="text-muted-foreground">
            Ajoute ta première URL Canva pour commencer le catalogue
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.map((design) => (
            <Card
              key={design.id}
              className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-2 border-primary/10 hover:border-primary/30"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={design.image_url}
                  alt={design.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {design.category && (
                  <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
                    {design.category}
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 line-clamp-2">{design.title}</h3>
                {design.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {design.description}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(design.canva_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir dans Canva
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
