import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlfieChat } from '@/components/AlfieChat';
import { Sparkles } from 'lucide-react';
import alfieMain from '@/assets/alfie-main.png';

export default function App() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header with Alfie */}
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Chat avec Alfie</h1>
            </div>
            <p className="text-muted-foreground">
              Ton agent de création qui transforme tes idées en visuels Canva magnifiques 🎨
            </p>
          </div>
          <img 
            src={alfieMain} 
            alt="Alfie" 
            className="w-24 h-24 object-contain animate-float"
          />
        </div>

        {/* Chat Interface */}
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <CardTitle>Discute avec Alfie</CardTitle>
            <CardDescription>
              Décris ce que tu veux créer et laisse Alfie te guider
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <AlfieChat />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
