import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const plans = [
  {
    name: 'Starter',
    price: '29€',
    features: ['1 marque', '20 visuels/mois', '2 templates', 'Support email'],
    popular: false
  },
  {
    name: 'Pro',
    price: '79€',
    features: ['3 marques', '100 visuels/mois', '4 templates + Reels', 'Support prioritaire'],
    popular: true
  },
  {
    name: 'Studio',
    price: '149€',
    features: ['Multi-marques', 'Visuels illimités', 'Reels avancés', 'Analytics'],
    popular: false
  },
  {
    name: 'Enterprise',
    price: '299€',
    features: ['Tout illimité', 'API & SSO', 'White-label', 'Support dédié'],
    popular: false
  }
];

export default function Billing() {
  const { profile } = useAuth();
  const currentPlan = profile?.plan || 'starter';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Abonnement
        </h1>
        <p className="text-muted-foreground">
          Gérez votre plan et votre facturation
        </p>
      </div>

      {/* Current Plan */}
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
              <span className="text-blue-600 dark:text-blue-400 font-bold">0 / {profile?.quota_visuals_per_month || 20}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <span className="font-medium text-purple-700 dark:text-purple-300">🎨 Marques:</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">0 / {profile?.quota_brands || 1}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full hover:scale-105 transition-transform">
            💳 Gérer ma facturation
          </Button>
        </CardFooter>
      </Card>

      {/* Plans */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const planColors = {
            'Starter': 'from-orange-500 to-red-500',
            'Pro': 'from-green-500 to-teal-500',
            'Studio': 'from-blue-500 to-purple-500',
            'Enterprise': 'from-purple-500 to-pink-500'
          }[plan.name] || 'from-gray-500 to-gray-600';
          
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
                <span className="text-3xl font-extrabold text-slate-900">{plan.price}</span>
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
                disabled={currentPlan === plan.name.toLowerCase()}
              >
                {currentPlan === plan.name.toLowerCase() ? '✓ Plan actuel' : `Choisir ${plan.name}`}
              </Button>
            </CardFooter>
          </Card>
        )})}
      </div>
    </div>
  );
}
