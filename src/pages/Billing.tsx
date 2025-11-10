import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, Settings, Sparkles, Award, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Starter',
    key: 'starter',
    price: '39€',
    quota_brands: 1,
    quota_visuals: 150,
    quota_videos: 15,
    features: [
      '1 Brand Kit dédié',
      '150 visuels/mois (quotas non reportables)',
      '15 vidéos/mois (15 Woofs)',
      'Canva : adaptation & dépôt inclus',
      'Stockage 30 jours (purge auto)',
      'Téléchargement illimité',
      'Support email'
    ],
    popular: false
  },
  {
    name: 'Pro',
    key: 'pro',
    price: '99€',
    quota_brands: 1,
    quota_visuals: 450,
    quota_videos: 45,
    features: [
      '1 Brand Kit dédié',
      '450 visuels/mois (quotas non reportables)',
      '45 vidéos/mois (45 Woofs)',
      'Canva : adaptation & dépôt inclus',
      'Stockage 30 jours (purge auto)',
      'Téléchargement illimité',
      'Add-on : Marque suppl. +39€/mois',
      'Support prioritaire'
    ],
    popular: true
  },
  {
    name: 'Studio',
    key: 'studio',
    price: '199€',
    quota_brands: 1,
    quota_visuals: 1000,
    quota_videos: 100,
    features: [
      '1 Brand Kit dédié',
      '1000 visuels/mois (quotas non reportables)',
      '100 vidéos/mois (100 Woofs)',
      'Canva : adaptation & dépôt inclus',
      'Stockage 30 jours (purge auto)',
      'Téléchargement illimité',
      'Add-on : Marque suppl. +39€/mois',
      'Packs Woofs (+50, +100)',
      'Analytics avancés',
      'Support prioritaire'
    ],
    popular: false
  },
  {
    name: 'Enterprise',
    key: 'enterprise',
    price: null,
    quota_brands: 999,
    quota_visuals: 9999,
    quota_videos: 9999,
    features: [
      'Marques illimitées',
      'Visuels illimités',
      'Vidéos illimitées (Woofs illimités)',
      'Canva : adaptation & dépôt inclus',
      'Stockage personnalisé',
      'API & SSO',
      'White-label',
      'Support dédié 24/7',
      'Formation personnalisée'
    ],
    popular: false,
    isEnterprise: true
  }
];

export default function Billing() {
  const { profile, user, refreshProfile, isAdmin, loading: authLoading } = useAuth();
  const { createCheckout, loading } = useStripeCheckout();
  const { openCustomerPortal, loading: portalLoading } = useCustomerPortal();
  const currentPlan = profile?.plan || null;
  const hasActivePlan = Boolean(profile?.status === 'active' || profile?.granted_by_admin);
  const isAmbassador = profile?.granted_by_admin;
  const hasStripeSubscription = profile?.stripe_subscription_id;

  // Ensure fresh profile on page load (avoids stale plan state)
  useEffect(() => {
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectPlan = async (plan: typeof plans[0]) => {
    if (plan.isEnterprise) {
      window.location.href = '/contact';
      return;
    }

    if (!user) {
      toast.error('Vous devez être connecté pour souscrire à un abonnement');
      return;
    }
    
    await createCheckout(plan.key as 'starter' | 'pro' | 'studio' | 'enterprise');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => (window.location.href = '/app')}>
          ← Retour
        </Button>
        <Button variant="ghost" size="sm" onClick={() => (window.location.href = '/dashboard')}>
          Aller au dashboard
        </Button>
      </div>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Abonnement
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Gérez votre plan et votre facturation
        </p>
        {user?.email && (
          <p className="text-sm text-muted-foreground mt-1">
            Connecté en tant que: <span className="font-medium">{user.email}</span>
          </p>
        )}
      </div>

      {!authLoading && isAdmin && (
        <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <Sparkles className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Accès Administrateur</AlertTitle>
          <AlertDescription className="text-green-700">
            Vous avez un accès administrateur avec toutes les fonctionnalités.
          </AlertDescription>
        </Alert>
      )}

      {!authLoading && !isAdmin && isAmbassador && (
        <Alert className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <Award className="h-4 w-4 text-purple-600" />
          <AlertTitle className="text-purple-800">🎖️ Accès Ambassadeur</AlertTitle>
          <AlertDescription className="text-purple-700">
            Vous disposez d'un accès {currentPlan?.toUpperCase()} Ambassadeur.
          </AlertDescription>
        </Alert>
      )}

      {!authLoading && !isAdmin && !isAmbassador && !hasActivePlan && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Abonnement inactif</AlertTitle>
          <AlertDescription className="text-red-700">
            Choisissez un plan pour débloquer toutes les fonctionnalités Alfie Designer.
          </AlertDescription>
        </Alert>
      )}

      {!isAdmin && !isAmbassador && currentPlan && currentPlan !== 'none' && (
        <Alert className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Plan actuel : {currentPlan.toUpperCase()}</AlertTitle>
          <AlertDescription className="text-blue-700">
            Votre abonnement est actif. Gérez votre abonnement ci-dessous.
          </AlertDescription>
        </Alert>
      )}


      {/* Current Plan */}
      {hasActivePlan && (
        <Card className="border-primary/30 shadow-medium gradient-subtle">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 mb-2">
                  <Badge className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-1 text-base">
                    Plan actuel: {currentPlan}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Profitez de tous les avantages de votre abonnement
                </CardDescription>
              </div>
              {hasStripeSubscription && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openCustomerPortal}
                  disabled={portalLoading}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  {portalLoading ? 'Chargement...' : 'Gérer'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="bg-card/50">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <span className="font-medium text-blue-700 dark:text-blue-300">📊 Visuels ce mois:</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{profile?.generations_this_month || 0} / {profile?.quota_visuals_per_month || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <span className="font-medium text-purple-700 dark:text-purple-300">🎬 Vidéos ce mois:</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">0 / {profile?.quota_videos || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <span className="font-medium text-green-700 dark:text-green-300">🎨 Brand Kits:</span>
                <span className="text-green-600 dark:text-green-400 font-bold">0 / {profile?.quota_brands || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
              className={cn(
                "relative hover:scale-105 transition-all",
                plan.popular && "border-primary border-2 shadow-strong",
                isCurrentPlan && "border-primary shadow-lg scale-105",
                !plan.popular && !isCurrentPlan && "shadow-medium"
              )}
            >
              {isCurrentPlan && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Votre plan actuel
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={`bg-gradient-to-r ${planColors} bg-clip-text text-transparent`}>
                    {plan.name}
                  </CardTitle>
                  {plan.popular && <Badge className="bg-gradient-to-r from-primary to-secondary text-white">⭐ Populaire</Badge>}
                </div>
              <CardDescription>
                {plan.price ? (
                  <>
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{plan.price}</span>
                    <span className="text-muted-foreground"> / mois</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-primary">Nous contacter</span>
                )}
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
                {plan.isEnterprise 
                  ? '📧 Nous contacter' 
                  : isCurrentPlan 
                  ? '✓ Plan actuel' 
                  : loading 
                  ? 'Chargement...' 
                  : `Choisir ${plan.name}`}
              </Button>
            </CardFooter>
          </Card>
        )})}
      </div>
    </div>
  );
}
