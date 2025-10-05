import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
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
        <h1 className="text-3xl font-bold mb-2">Abonnement</h1>
        <p className="text-muted-foreground">
          Gérez votre plan et votre facturation
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Plan actuel</CardTitle>
          <CardDescription>
            Vous êtes actuellement sur le plan <Badge>{currentPlan}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Visuels ce mois:</span>{' '}
              <span className="text-muted-foreground">0 / {profile?.quota_visuals_per_month || 20}</span>
            </p>
            <p className="text-sm">
              <span className="font-medium">Marques:</span>{' '}
              <span className="text-muted-foreground">0 / {profile?.quota_brands || 1}</span>
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline">Gérer ma facturation</Button>
        </CardFooter>
      </Card>

      {/* Plans */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={plan.popular ? 'border-slate-900 shadow-lg' : ''}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.popular && <Badge>Populaire</Badge>}
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
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
                disabled={currentPlan === plan.name.toLowerCase()}
              >
                {currentPlan === plan.name.toLowerCase() ? 'Plan actuel' : 'Choisir'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
