import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Users, FileText, DollarSign, Activity, ArrowLeft, Sparkles, Plus, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [usersRes, affiliatesRes, conversionsRes, payoutsRes, designsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('affiliates').select('*').order('created_at', { ascending: false }),
        supabase
          .from('affiliate_conversions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('affiliate_payouts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('canva_designs').select('*').order('created_at', { ascending: false })
      ]);

      setUsers(usersRes.data || []);
      setAffiliates(affiliatesRes.data || []);
      setConversions(conversionsRes.data || []);
      setPayouts(payoutsRes.data || []);
      setDesigns(designsRes.data || []);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    if (!newUrl.trim()) {
      toast.error('URL requise', { description: 'Veuillez entrer une URL Canva' });
      return;
    }

    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-canva', {
        body: { url: newUrl, category },
      });

      if (error) throw error;

      toast.success('Design ajouté', { description: 'Le design a été ajouté au catalogue' });
      setNewUrl('');
      setCategory('');
      loadAdminData();
    } catch (error) {
      console.error('Scraping error:', error);
      toast.error('Erreur', { description: 'Impossible de scraper ce design' });
    } finally {
      setScraping(false);
    }
  };

  const handleDeleteDesign = async (id: string) => {
    try {
      const { error } = await supabase.from('canva_designs').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Design supprimé');
      loadAdminData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'starter': return 'bg-orange-500';
      case 'pro': return 'bg-green-500';
      case 'studio': return 'bg-blue-500';
      case 'enterprise': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'paid': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">
            Gérez les utilisateurs, affiliés et paiements
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/app')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour Client
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Affiliés</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliates.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Payouts en attente</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payouts.filter(p => p.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliés</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="catalog">Catalogue Canva</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs</CardTitle>
              <CardDescription>Tous les utilisateurs de la plateforme</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-4">Chargement...</p>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition"
                    >
                      <div>
                        <p className="font-medium">{user.full_name || user.email}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPlanBadgeColor(user.plan)}>
                          {user.plan}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Affiliates Tab */}
        <TabsContent value="affiliates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Affiliés</CardTitle>
              <CardDescription>Tous les comptes affiliés actifs</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-4">Chargement...</p>
              ) : affiliates.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucun affilié</p>
              ) : (
                <div className="space-y-2">
                  {affiliates.map((affiliate) => (
                    <div
                      key={affiliate.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition"
                    >
                      <div>
                        <p className="font-medium">{affiliate.name}</p>
                        <p className="text-sm text-muted-foreground">{affiliate.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={affiliate.status === 'active' ? 'default' : 'secondary'}>
                          {affiliate.status}
                        </Badge>
                        {affiliate.payout_method && (
                          <span className="text-sm text-muted-foreground">
                            {affiliate.payout_method}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversions Tab */}
        <TabsContent value="conversions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversions</CardTitle>
              <CardDescription>Suivi des conversions affiliés</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-4">Chargement...</p>
              ) : conversions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucune conversion</p>
              ) : (
                <div className="space-y-2">
                  {conversions.map((conversion: any) => (
                    <div
                      key={conversion.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition"
                    >
                      <div>
                        <p className="font-medium">Utilisateur: {conversion.user_id.substring(0, 8)}...</p>
                        <p className="text-sm text-muted-foreground">
                          Plan: {conversion.plan} • {new Date(conversion.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusBadgeColor(conversion.status)}>
                          {conversion.status}
                        </Badge>
                        <span className="font-medium">{conversion.amount}€</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payouts</CardTitle>
              <CardDescription>Gérer les paiements aux affiliés</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-4">Chargement...</p>
              ) : payouts.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucun payout</p>
              ) : (
                <div className="space-y-2">
                  {payouts.map((payout: any) => (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition"
                    >
                      <div>
                        <p className="font-medium">Affilié: {payout.affiliate_id.substring(0, 8)}...</p>
                        <p className="text-sm text-muted-foreground">
                          Période: {payout.period}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusBadgeColor(payout.status)}>
                          {payout.status}
                        </Badge>
                        <span className="font-bold">{payout.amount}€</span>
                        {payout.paid_at && (
                          <span className="text-sm text-muted-foreground">
                            {new Date(payout.paid_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Catalog Tab */}
        <TabsContent value="catalog" className="space-y-4">
          <Card className="shadow-strong border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Ajouter un design Canva
              </CardTitle>
              <CardDescription>
                Scrapez des designs Canva publics pour enrichir le catalogue client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="URL Canva (https://www.canva.com/design/...)"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Niche / Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Button onClick={handleScrape} disabled={scraping}>
                    <Plus className="h-4 w-4 mr-2" />
                    {scraping ? 'Ajout...' : 'Ajouter'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Designs du catalogue ({designs.length})</CardTitle>
              <CardDescription>Tous les designs visibles par les clients</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[4/3] bg-muted rounded-lg mb-2" />
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : designs.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun design</h3>
                  <p className="text-muted-foreground">
                    Ajoutez votre premier design Canva ci-dessus
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {designs.map((design) => (
                    <Card key={design.id} className="overflow-hidden group">
                      <div className="relative aspect-[4/3] bg-muted">
                        <img
                          src={design.image_url}
                          alt={design.title}
                          className="w-full h-full object-cover"
                        />
                        {design.category && (
                          <Badge className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm">
                            {design.category}
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-1 line-clamp-1">{design.title}</h4>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {design.description || 'Aucune description'}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => window.open(design.canva_url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Voir
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteDesign(design.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
