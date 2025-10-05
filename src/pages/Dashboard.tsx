import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ExternalLink, Plus } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [postsRes, brandsRes] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('brands')
          .select('*')
          .eq('user_id', user.id)
      ]);

      setPosts(postsRes.data || []);
      setBrands(brandsRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Retrouvez vos créations et gérez vos marques
          </p>
        </div>

        {/* Brands */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mes marques</CardTitle>
                <CardDescription>Gérez vos Brand Kits</CardDescription>
              </div>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {brands.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune marque configurée
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {brands.map((brand) => (
                  <Card key={brand.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{brand.name}</CardTitle>
                      <CardDescription>
                        <Badge variant={brand.canva_connected ? 'default' : 'secondary'}>
                          {brand.canva_connected ? 'Connecté' : 'Non connecté'}
                        </Badge>
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Créations récentes</CardTitle>
            <CardDescription>Vos derniers visuels générés</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Chargement...</p>
            ) : posts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune création pour le moment
              </p>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition"
                  >
                    <div>
                      <h3 className="font-medium">{post.title || 'Sans titre'}</h3>
                      <p className="text-sm text-muted-foreground">
                        Type: {post.type} • {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={post.status === 'draft' ? 'secondary' : 'default'}>
                        {post.status}
                      </Badge>
                      {post.planner_deep_link && (
                        <Button size="sm" variant="outline" className="gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Ouvrir
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
