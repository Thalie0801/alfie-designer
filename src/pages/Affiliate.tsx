import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Copy, DollarSign, MousePointerClick, TrendingUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function Affiliate() {
  const { user } = useAuth();
  const [affiliate, setAffiliate] = useState<any>(null);
  const [clicks, setClicks] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClicks: 0,
    totalConversions: 0,
    totalEarnings: 0,
    pendingPayout: 0
  });

  useEffect(() => {
    loadAffiliateData();
  }, [user]);

  const loadAffiliateData = async () => {
    if (!user) return;

    try {
      // Get affiliate info
      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('*')
        .eq('email', user.email)
        .single();

      if (!affiliateData) {
        toast.error('Compte affilié non trouvé');
        return;
      }

      setAffiliate(affiliateData);

      // Get clicks
      const { data: clicksData } = await supabase
        .from('affiliate_clicks')
        .select('*')
        .eq('affiliate_id', affiliateData.id)
        .order('created_at', { ascending: false })
        .limit(100);

      // Get conversions
      const { data: conversionsData } = await supabase
        .from('affiliate_conversions')
        .select('*')
        .eq('affiliate_id', affiliateData.id)
        .order('created_at', { ascending: false });

      // Get payouts
      const { data: payoutsData } = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('affiliate_id', affiliateData.id)
        .order('created_at', { ascending: false });

      setClicks(clicksData || []);
      setConversions(conversionsData || []);
      setPayouts(payoutsData || []);

      // Calculate stats
      const totalEarnings = (conversionsData || []).reduce(
        (sum: number, conv: any) => sum + Number(conv.amount),
        0
      );
      const pendingPayout = (payoutsData || [])
        .filter((p: any) => p.status === 'pending')
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

      setStats({
        totalClicks: clicksData?.length || 0,
        totalConversions: conversionsData?.length || 0,
        totalEarnings,
        pendingPayout
      });
    } catch (error) {
      console.error('Error loading affiliate data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const copyAffiliateLink = () => {
    if (!affiliate) return;
    
    const link = `${window.location.origin}?ref=${affiliate.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Lien copié !');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </AppLayout>
    );
  }

  if (!affiliate) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Compte affilié non trouvé</h1>
          <p className="text-muted-foreground mb-6">
            Contactez-nous pour devenir affilié Alfie
          </p>
          <Button asChild>
            <a href="mailto:support@alfie.com">Nous contacter</a>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Programme d'affiliation</h1>
          <p className="text-muted-foreground">
            Bienvenue {affiliate.name} ! Suivez vos performances ici.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Clics</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClicks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConversions}</div>
              {stats.totalClicks > 0 && (
                <p className="text-xs text-muted-foreground">
                  {((stats.totalConversions / stats.totalClicks) * 100).toFixed(1)}% taux de conversion
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Gains totaux</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEarnings.toFixed(2)}€</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Payout en attente</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingPayout.toFixed(2)}€</div>
            </CardContent>
          </Card>
        </div>

        {/* Affiliate Link */}
        <Card>
          <CardHeader>
            <CardTitle>Votre lien d'affiliation</CardTitle>
            <CardDescription>
              Partagez ce lien pour gagner des commissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${window.location.origin}?ref=${affiliate.id}`}
                className="font-mono text-sm"
              />
              <Button onClick={copyAffiliateLink} className="gap-2">
                <Copy className="h-4 w-4" />
                Copier
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Commission: 20% sur tous les plans • Cookie: 30 jours
            </p>
          </CardContent>
        </Card>

        {/* Recent Conversions */}
        <Card>
          <CardHeader>
            <CardTitle>Conversions récentes</CardTitle>
            <CardDescription>Vos dernières ventes</CardDescription>
          </CardHeader>
          <CardContent>
            {conversions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Aucune conversion pour le moment
              </p>
            ) : (
              <div className="space-y-2">
                {conversions.slice(0, 10).map((conversion) => (
                  <div
                    key={conversion.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">Plan {conversion.plan}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(conversion.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={conversion.status === 'pending' ? 'secondary' : 'default'}>
                        {conversion.status}
                      </Badge>
                      <span className="font-bold">{conversion.amount}€</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payouts History */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des paiements</CardTitle>
            <CardDescription>Vos payouts</CardDescription>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Aucun payout pour le moment
              </p>
            ) : (
              <div className="space-y-2">
                {payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">Payout {payout.period}</p>
                      <p className="text-sm text-muted-foreground">
                        {payout.paid_at
                          ? `Payé le ${new Date(payout.paid_at).toLocaleDateString()}`
                          : 'En attente'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={payout.status === 'paid' ? 'default' : 'secondary'}>
                        {payout.status}
                      </Badge>
                      <span className="font-bold">{payout.amount}€</span>
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
