import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, User, Mail, CreditCard } from 'lucide-react';

export default function Profile() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      starter: 'Starter',
      pro: 'Pro',
      business: 'Business',
      enterprise: 'Enterprise'
    };
    return labels[plan] || plan;
  };

  const getPlanVariant = (plan: string) => {
    const variants: Record<string, 'default' | 'secondary'> = {
      starter: 'secondary',
      pro: 'default',
      business: 'default',
      enterprise: 'default'
    };
    return variants[plan] || 'secondary';
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Mon Profil</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations personnelles
          </CardTitle>
          <CardDescription>
            Mettez à jour vos informations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Votre nom"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                L'email ne peut pas être modifié
              </p>
            </div>

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Subscription Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Abonnement
          </CardTitle>
          <CardDescription>
            Informations sur votre plan actuel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Plan actuel</span>
            <Badge variant={getPlanVariant(profile?.plan || 'starter')}>
              {getPlanLabel(profile?.plan || 'starter')}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Visuels par mois</span>
            <span className="text-sm text-muted-foreground">
              {profile?.quota_visuals_per_month || 20}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Marques autorisées</span>
            <span className="text-sm text-muted-foreground">
              {profile?.quota_brands || 1}
            </span>
          </div>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = '/billing'}
          >
            Gérer mon abonnement
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
