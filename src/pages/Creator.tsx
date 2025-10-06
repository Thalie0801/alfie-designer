import { AppLayoutWithSidebar } from '@/components/AppLayoutWithSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlfieChat } from '@/components/AlfieChat';
import { BrandKitManager } from '@/components/BrandKitManager';
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
            Alfie Designer
          </h1>
        </div>
        <p className="text-muted-foreground">
          Ton assistant créatif IA qui trouve, adapte et génère des visuels Canva sur mesure 🎨✨
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card className="shadow-strong border-2 border-primary/20">
            <CardHeader className="border-b bg-gradient-subtle">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Chat avec Alfie
              </CardTitle>
              <CardDescription>
                Décris ce que tu veux créer, Alfie s'occupe du reste
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <AlfieChat />
            </CardContent>
          </Card>
        </div>

        {/* Brand Kit Manager - Takes 1 column */}
        <div className="lg:col-span-1">
          <BrandKitManager />
        </div>
      </div>
    </div>
  );
}
