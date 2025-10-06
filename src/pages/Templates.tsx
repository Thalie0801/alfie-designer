import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExternalLink, Sparkles, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';

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
  const { profile } = useAuth();
  const [designs, setDesigns] = useState<CanvaDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    loadDesigns();
  }, []);

  const loadDesigns = async () => {
    try {
      let query = supabase
        .from('canva_designs')
        .select('*')
        .order('created_at', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDesigns(data || []);
    } catch (error) {
      console.error('Error loading designs:', error);
      toast.error('Impossible de charger les designs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDesigns();
  }, [categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="gradient-subtle rounded-2xl p-6 border-2 border-primary/20 shadow-medium">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary to-secondary p-3 rounded-xl shadow-glow">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Catalogue Canva
              </h1>
              <p className="text-muted-foreground">
                Designs inspirants pour tes créations 🎨
              </p>
            </div>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrer par niche" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les niches</SelectItem>
              <SelectItem value="e-commerce">E-commerce</SelectItem>
              <SelectItem value="coaching">Coaching</SelectItem>
              <SelectItem value="immobilier">Immobilier</SelectItem>
              <SelectItem value="restauration">Restauration</SelectItem>
              <SelectItem value="mode">Mode & Beauté</SelectItem>
              <SelectItem value="tech">Tech & SaaS</SelectItem>
              <SelectItem value="sport">Sport & Fitness</SelectItem>
              <SelectItem value="sante">Santé & Bien-être</SelectItem>
              <SelectItem value="education">Éducation</SelectItem>
              <SelectItem value="general">Général</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
