import { AppLayoutWithSidebar } from '@/components/AppLayoutWithSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlfieChat } from '@/components/AlfieChat';
import { Sparkles } from 'lucide-react';

export default function App() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Chat avec Alfie</h1>
        </div>
        <p className="text-muted-foreground">
          Ton agent de création qui transforme tes idées en visuels Canva magnifiques 🎨
        </p>
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
  );
}
