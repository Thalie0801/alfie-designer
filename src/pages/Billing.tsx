import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, CreditCard, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { CreditBalance } from '@/components/CreditBalance';

const plans = [
  {
    name: 'Starter',
    key: 'starter',
    price: '29€',
    quota_brands: 1,
    quota_visuals: 20,
    features: ['1 marque', '20 visuels/mois', '2 templates', 'Support email'],
    popular: false
  },
  {
    name: 'Pro',
    key: 'pro',
    price: '79€',
    quota_brands: 3,
    quota_visuals: 100,
    features: ['3 marques', '100 visuels/mois', '4 templates + Reels', 'Support prioritaire'],
    popular: true
  },
  {
    name: 'Studio',
    key: 'studio',
    price: '149€',
    quota_brands: 5,
    quota_visuals: 1000,
    features: ['Multi-marques', '1000 visuels/mois', 'Reels avancés', 'Analytics'],
    popular: false
  },
  {
    name: 'Enterprise',
    key: 'enterprise',
    price: '299€',
    quota_brands: 999,
    quota_visuals: 9999,
    features: ['Tout illimité', 'API & SSO', 'White-label', 'Support dédié'],
    popular: false
  }
];

export default function Billing() {
  const { profile, user, refreshProfile } = useAuth();
  const { createCheckout, loading } = useStripeCheckout();
  const [activating, setActivating] = useState(false);
  const currentPlan = profile?.plan || null;
  const hasActivePlan = currentPlan && currentPlan !== 'none';

  const handleSelectPlan = async (plan: typeof plans[0]) => {
    if (!user) {
      toast.error('Vous devez être connecté pour souscrire à un abonnement');
      return;
    }
    
    await createCheckout(plan.key as 'starter' | 'pro' | 'studio' | 'enterprise');
  };

  const handleActivateFreeStudio = async () => {
    if (!user) return;
    
    setActivating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          plan: 'studio',
          quota_brands: 5,
          quota_visuals_per_month: 1000
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Plan Studio activé gratuitement !');
      await refreshProfile();
    } catch (error) {
      console.error('Error activating free studio:', error);
      toast.error('Erreur lors de l\'activation du plan');
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Abonnement
        </h1>
        <p className="text-muted-foreground">
          Gérez votre plan et votre facturation
        </p>
        {user?.email && (
          <p className="text-sm text-muted-foreground mt-1">
            Connecté en tant que: <span className="font-medium">{user.email}</span>
          </p>
        )}
      </div>

      {user?.email === 'nathaliestaelens@gmail.com' && currentPlan !== 'studio' && (
        <Alert className="border-green-500/50 bg-green-50 dark:bg-green-900/20">
          <AlertDescription className="flex items-center justify-between">
            <span className="text-green-700 dark:text-green-300">
              Activez le plan Studio gratuitement pour tester l'application
            </span>
            <Button
              onClick={handleActivateFreeStudio}
              disabled={activating}
              className="bg-green-600 hover:bg-green-700"
            >
              {activating ? 'Activation...' : 'Activer Studio (gratuit)'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!hasActivePlan && (
        <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-900/20">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            Vous n'avez pas de plan actif. Choisissez un plan ci-dessous pour accéder à Alfie Designer.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan */}
      {hasActivePlan && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-primary/30 shadow-medium gradient-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-1 text-base">
                  Plan actuel: {currentPlan}
                </Badge>
              </CardTitle>
              <CardDescription>
                Profitez de tous les avantages de votre abonnement
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-card/50">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <span className="font-medium text-blue-700 dark:text-blue-300">📊 Visuels ce mois:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">0 / {profile?.quota_visuals_per_month || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <span className="font-medium text-purple-700 dark:text-purple-300">🎨 Marques:</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">0 / {profile?.quota_brands || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <CreditBalance />
        </div>
      )}

      {/* Plans */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const planColors = {
            'Starter': 'from-orange-500 to-red-500',
            'Pro': 'from-green-500 to-teal-500',
            'Studio': 'from-blue-500 to-purple-500',
            'Enterprise': 'from-purple-500 to-pink-500'
          }[plan.name] || 'from-gray-500 to-gray-600';
          
          const isCurrentPlan = currentPlan === plan.key;
          
          return (
            <Card
              key={plan.name}
              className={`hover:scale-105 transition-transform ${plan.popular ? 'border-primary border-2 shadow-strong' : 'shadow-medium'}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={`bg-gradient-to-r ${planColors} bg-clip-text text-transparent`}>
                    {plan.name}
                  </CardTitle>
                  {plan.popular && <Badge className="bg-gradient-to-r from-primary to-secondary text-white">⭐ Populaire</Badge>}
                </div>
              <CardDescription>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{plan.price}</span>
                <span className="text-muted-foreground"> / mois</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className={`w-full ${plan.popular ? 'gradient-hero text-white shadow-medium' : ''}`}
                variant={plan.popular ? 'default' : 'outline'}
                disabled={isCurrentPlan || loading}
                onClick={() => handleSelectPlan(plan)}
              >
                {isCurrentPlan ? '✓ Plan actuel' : loading ? 'Chargement...' : `Choisir ${plan.name}`}
              </Button>
            </CardFooter>
          </Card>
        )})}
      </div>
    </div>
  );
}
