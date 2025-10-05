import { AlfieHeader } from "@/components/AlfieHeader";
import { FeatureCard } from "@/components/FeatureCard";
import { VisualTypeCard } from "@/components/VisualTypeCard";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Zap, 
  Palette, 
  Brain,
  Image,
  LayoutGrid,
  TrendingUp,
  Video,
  ArrowRight
} from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen gradient-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <AlfieHeader />

        {/* Features Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Pourquoi choisir Alfie ?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Un assistant IA qui comprend votre marque et crée des visuels professionnels en quelques secondes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Brain className="w-6 h-6" />}
              title="IA Créative"
              description="Gemini 2.5 Flash génère des textes percutants adaptés à votre audience."
              gradient="hero"
            />
            <FeatureCard
              icon={<Palette className="w-6 h-6" />}
              title="Brand Kit"
              description="Respecte automatiquement votre palette, polices et identité visuelle."
              gradient="warm"
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Intégration Canva"
              description="Vos visuels s'ouvrent directement dans votre compte Canva."
              gradient="hero"
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="Zéro Publication"
              description="Vous gardez le contrôle. Validez et planifiez depuis Canva Planner."
              gradient="warm"
            />
          </div>
        </section>

        {/* Visual Types Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Types de visuels disponibles
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Choisissez le format parfait pour votre message.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <VisualTypeCard
              icon={<Image className="w-7 h-7" />}
              type="HERO"
              title="Post Hero"
              description="Post d'annonce impactant pour vos lancements et offres."
              ratios={["1:1", "16:9"]}
              color="blue"
            />
            <VisualTypeCard
              icon={<LayoutGrid className="w-7 h-7" />}
              type="CAROUSEL"
              title="Carrousel"
              description="Contenu éducatif en 5-7 slides pour engager votre audience."
              ratios={["4:5"]}
              color="orange"
            />
            <VisualTypeCard
              icon={<TrendingUp className="w-7 h-7" />}
              type="INSIGHT"
              title="Statistique"
              description="Mettez en valeur vos résultats avec des chiffres percutants."
              ratios={["1:1", "4:5"]}
              color="purple"
            />
            <VisualTypeCard
              icon={<Video className="w-7 h-7" />}
              type="REEL"
              title="Vidéo Reel"
              description="Script vidéo court (8-20s) pour dynamiser votre contenu."
              ratios={["9:16"]}
              color="green"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="mb-12">
          <div className="relative overflow-hidden rounded-3xl">
            <div className="absolute inset-0 gradient-warm opacity-90" />
            <div className="relative px-8 py-16 text-center text-white">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Prêt à transformer votre contenu ?
              </h2>
              <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
                Connectez votre Canva et commencez à créer des visuels professionnels en quelques clics.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" className="bg-white text-foreground hover:bg-white/90 shadow-strong" onClick={() => window.location.href = '/demo'}>
                  Tester la démo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  En savoir plus
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
