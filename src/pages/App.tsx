import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Layers, BarChart3, Film, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

type VisualType = 'hero' | 'carousel' | 'insight' | 'reel';

export default function App() {
  const { profile } = useAuth();
  const [selectedType, setSelectedType] = useState<VisualType | null>(null);
  const [theme, setTheme] = useState('');
  const [style, setStyle] = useState('');
  const [channel, setChannel] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  const visualTypes = [
    {
      type: 'hero' as VisualType,
      icon: Sparkles,
      title: 'Hero / Announcement',
      description: 'Post d\'annonce impactant',
      ratios: '1:1 • 16:9',
      color: 'bg-blue-500'
    },
    {
      type: 'carousel' as VisualType,
      icon: Layers,
      title: 'Carousel / Educatif',
      description: 'Contenu en 5-7 slides',
      ratios: '4:5',
      color: 'bg-orange-500'
    },
    {
      type: 'insight' as VisualType,
      icon: BarChart3,
      title: 'Insight / Stats',
      description: 'Statistique percutante',
      ratios: '1:1 • 4:5',
      color: 'bg-purple-500'
    },
    {
      type: 'reel' as VisualType,
      icon: Film,
      title: 'Reel / Short',
      description: 'Vidéo 8-20s',
      ratios: '9:16',
      color: 'bg-green-500'
    }
  ];

  const handleGenerate = async () => {
    if (!selectedType || !theme) {
      toast.error('Sélectionnez un type et un thème');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('alfie-generate', {
        body: {
          type: selectedType,
          theme,
          style: style || 'moderne',
          brandVoice: 'professionnel',
          channel: channel || 'LinkedIn'
        }
      });

      if (error) throw error;

      setGeneratedContent(data.content);
      toast.success('Contenu généré avec succès !');
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Créer un visuel</h1>
          <p className="text-muted-foreground">
            Choisissez un format et décrivez votre idée. Alfie s'occupe du reste.
          </p>
        </div>

        {/* Visual Type Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {visualTypes.map((vt) => (
            <Card
              key={vt.type}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedType === vt.type ? 'ring-2 ring-slate-900' : ''
              }`}
              onClick={() => setSelectedType(vt.type)}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl ${vt.color} text-white`}>
                    <vt.icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline">{vt.ratios}</Badge>
                </div>
                <CardTitle className="text-lg">{vt.title}</CardTitle>
                <CardDescription>{vt.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Brief Form */}
        {selectedType && (
          <Card>
            <CardHeader>
              <CardTitle>Brief rapide</CardTitle>
              <CardDescription>
                Décrivez votre idée en quelques mots
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  placeholder="Thème / idée (ex: Lancement Q4, Témoignage, Tuto)"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  placeholder="Style (Minimal, Luxe, Color Pop)"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                />
                <Input
                  placeholder="Canaux (IG, LinkedIn…)"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                />
              </div>
              <Textarea
                placeholder="Notes (ton, CTA, hashtags)…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full gap-2"
                size="lg"
              >
                <Zap className="h-5 w-5" />
                {loading ? 'Génération en cours...' : 'Générer mon visuel'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Generated Content */}
        {generatedContent && (
          <Card>
            <CardHeader>
              <CardTitle>Contenu généré</CardTitle>
              <CardDescription>Voici ce qu'Alfie a créé pour vous</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedContent.headline && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Headline</p>
                  <p className="text-lg font-bold">{generatedContent.headline}</p>
                </div>
              )}
              {generatedContent.hook && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Hook</p>
                  <p className="text-lg font-semibold">{generatedContent.hook}</p>
                </div>
              )}
              {generatedContent.steps && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Steps</p>
                  <ul className="space-y-2">
                    {generatedContent.steps.map((step: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <Badge variant="secondary">{i + 1}</Badge>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {generatedContent.cta && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">CTA</p>
                  <p className="font-semibold">{generatedContent.cta}</p>
                </div>
              )}
              {generatedContent.caption && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Caption</p>
                  <p className="text-sm">{generatedContent.caption}</p>
                </div>
              )}
              {generatedContent.hashtags && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Hashtags</p>
                  <p className="text-sm">{generatedContent.hashtags.join(' ')}</p>
                </div>
              )}
              <div className="pt-4 border-t">
                <Button className="w-full" size="lg">
                  Ouvrir dans Canva
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
