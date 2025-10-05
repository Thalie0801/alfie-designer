import { AppLayoutWithSidebar } from '@/components/AppLayoutWithSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlfieChat } from '@/components/AlfieChat';
import { Sparkles } from 'lucide-react';

export default function App() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="gradient-subtle rounded-2xl p-6 border-2 border-primary/20 shadow-medium">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-primary to-secondary p-3 rounded-xl shadow-glow">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Chat avec Alfie
          </h1>
        </div>
        <p className="text-muted-foreground">
          Ton agent de création qui transforme tes idées en visuels Canva magnifiques 🎨✨
        </p>
      </div>

        {/* Chat Interface */}
        <Card className="shadow-strong border-2 border-primary/20">
          <CardHeader className="border-b bg-gradient-subtle">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Discute avec Alfie
            </CardTitle>
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
