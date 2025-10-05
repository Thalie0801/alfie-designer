import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Palette, CalendarClock, Film, BarChart3, Layers, Share2, ChevronRight, Shield } from "lucide-react";
import alfieMain from "@/assets/alfie-main.png";

// --- Hooks to simulate actions (replace with Lovable actions / API calls) ---
const useAlfieActions = () => {
  const connectCanva = () => alert("OAuth Canva → redirection… (remplacer par oauth_canva_start)");
  const createHero = () => alert("Créer design Hero… (design_create_from_template)");
  const createCarousel = () => alert("Créer design Carousel…");
  const createInsight = () => alert("Créer design Insight…");
  const createReel = () => alert("Créer design Reel 9:16…");
  return { connectCanva, createHero, createCarousel, createInsight, createReel };
};

export default function AlfieLanding() {
  const { connectCanva, createHero, createCarousel, createInsight, createReel } = useAlfieActions();
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
      {/* Navbar */}
      <header className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-white shadow-sm"><Sparkles className="h-5 w-5"/></span>
            <span className="font-semibold">Alfie Designer</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => window.location.href = '/auth'}>Ouvrir l'app</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-14 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight animate-fade-in">
            Ton agent de création <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">via Canva</span> 👋
          </h1>
          <p className="mt-4 text-lg text-slate-600 animate-fade-in">Alfie est ton agent de création et planification. Demande-lui ce que tu souhaites et hop, ton design arrive directement dans ton Canva !</p>
              <div className="mt-6 flex flex-wrap gap-3 animate-fade-in">
                <Button size="lg" className="gradient-hero text-white shadow-medium hover:shadow-strong" onClick={() => window.location.href = '/auth'}>
                  Commencer ✨
                </Button>
                <Button size="lg" variant="outline" className="hover:scale-105 transition-transform" onClick={() => window.location.href = '/auth'}>
                  Voir une démo
                </Button>
              </div>
          <div className="mt-6 flex items-center gap-4 text-slate-500 text-sm">
            <div className="flex items-center gap-2"><Shield className="h-4 w-4"/> Client maître : aucune publication auto</div>
            <div className="flex items-center gap-2"><Palette className="h-4 w-4"/> Brand Kit appliqué</div>
            <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4"/> Planif dans Canva</div>
          </div>
        </div>
        <div className="relative">
          {/* Alfie Sticker Flottant */}
          <div className="absolute -top-12 -left-8 z-10 animate-float">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-accent rounded-full blur-2xl opacity-60 animate-pulse-soft"></div>
              <div className="relative rounded-full border-4 border-white shadow-strong overflow-hidden w-32 h-32 bg-gradient-to-br from-primary/20 to-secondary/20">
                <img src={alfieMain} alt="Alfie" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-secondary text-white rounded-full px-3 py-1 text-xs font-bold shadow-medium">
                👋 Alfie
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white shadow-xl p-6">
            <div className="grid grid-cols-2 gap-4">
              <MiniCard icon={<Sparkles className="h-5 w-5"/>} title="Hero / Announcement" subtitle="1:1 • 16:9" onClick={createHero}/>
              <MiniCard icon={<Layers className="h-5 w-5"/>} title="Carousel / Educatif" subtitle="4:5" onClick={createCarousel}/>
              <MiniCard icon={<BarChart3 className="h-5 w-5"/>} title="Insight / Stats" subtitle="1:1 • 4:5" onClick={createInsight}/>
              <MiniCard icon={<Film className="h-5 w-5"/>} title="Reel / Short" subtitle="9:16" onClick={createReel}/>
            </div>
            <div className="mt-6 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 p-4 border border-primary/10">
              <p className="text-sm font-semibold text-slate-700">Brief rapide</p>
              <div className="mt-3 grid gap-3">
                <Input placeholder="Thème / idée (ex: Lancement Q4, Témoignage, Tuto)"/>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input placeholder="Style (Minimal, Luxe, Color Pop)"/>
                  <Input placeholder="Canaux (IG, LinkedIn…)"/>
                </div>
                <Textarea placeholder="Notes (ton, CTA, hashtags)…"/>
                <Button className="w-full shadow-medium">Générer mes visuels</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8 text-center">Comment ça marche ?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white text-2xl font-bold mb-4">1</div>
            <h3 className="text-xl font-semibold mb-2">Connecte ton Canva</h3>
            <p className="text-slate-600">Lie ton compte Canva en un clic pour permettre à Alfie de créer directement dans ton espace.</p>
          </div>
          <div className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white text-2xl font-bold mb-4">2</div>
            <h3 className="text-xl font-semibold mb-2">Donne ton brief à Alfie</h3>
            <p className="text-slate-600">Dis-lui simplement ce que tu veux : un post hero, un carrousel, une stat... Alfie comprend.</p>
          </div>
          <div className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white text-2xl font-bold mb-4">3</div>
            <h3 className="text-xl font-semibold mb-2">Tout arrive sur ton Canva</h3>
            <p className="text-slate-600">Alfie crée le design avec ta marque et l'envoie directement dans ton Canva. Plus qu'à finaliser !</p>
          </div>
        </div>
      </section>

      {/* Cards — Create Visuals */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Créer des visuels en 1 clic</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          <TemplateCard title="Hero" subtitle="Annonce, Cover, Citation" ratios="1:1 • 16:9" onCreate={createHero} />
          <TemplateCard title="Carousel" subtitle="Tips, Storytelling" ratios="4:5" onCreate={createCarousel} />
          <TemplateCard title="Insight" subtitle="Stat, Preuve, Donnée" ratios="1:1 • 4:5" onCreate={createInsight} />
          <TemplateCard title="Reel" subtitle="Vidéo 8–20 s" ratios="9:16" onCreate={createReel} />
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-bold mb-8">Tarifs clairs, évolutifs</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          <PriceCard title="Starter" price="29€" bullets={["1 marque","20 visuels/mois","2 templates"]} cta="Essayer Starter"/>
          <PriceCard title="Pro" price="79€" highlight bullets={["3 marques","100 visuels/mois","4 templates + Reels simples"]} cta="Choisir Pro"/>
          <PriceCard title="Studio" price="149€" bullets={["Multi-marques","Reels avancés","Analytics"]} cta="Passer Studio"/>
          <PriceCard title="Enterprise" price="299€" bullets={["Illimité","API & SSO","Support prioritaire"]} cta="Demander un devis"/>
        </div>
      </section>

      {/* CTA + Email capture */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-10 text-center shadow-sm">
          <h3 className="text-2xl md:text-3xl font-bold">Commence dès aujourd'hui</h3>
          <p className="mt-2 text-slate-600">Crée ton compte, connecte ton Canva et génère tes premiers visuels en moins d'une minute.</p>
              <div className="mt-6 flex flex-col md:flex-row gap-3 justify-center">
                <Input placeholder="Ton e-mail" value={email} onChange={(e)=>setEmail(e.target.value)} className="md:w-80"/>
                <Button size="lg" onClick={() => window.location.href = '/auth'}>Commencer gratuitement</Button>
              </div>
          <p className="mt-3 text-xs text-slate-500 flex items-center justify-center gap-1"><Shield className="h-3 w-3"/> Aucune publication automatique — tu restes maître.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-6 text-sm text-slate-600">
          <div>
            <div className="font-semibold mb-2">Alfie Designer</div>
            <p>Agent de création IA. Tes visuels restent stockés dans ton compte Canva.</p>
          </div>
          <div>
            <div className="font-semibold mb-2">Ressources</div>
            <ul className="space-y-1">
              <li><a className="hover:underline" href="#">Guide de démarrage</a></li>
              <li><a className="hover:underline" href="#">FAQ</a></li>
              <li><a className="hover:underline" href="#">Programme d'affiliation</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">Légal</div>
            <ul className="space-y-1">
              <li><a className="hover:underline" href="#">Confidentialité</a></li>
              <li><a className="hover:underline" href="#">Conditions</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MiniCard({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick?: ()=>void }) {
  return (
    <button onClick={onClick} className="group text-left rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">{icon}</span>
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-xs text-slate-500">{subtitle}</div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition"/>
      </div>
    </button>
  );
}

function TemplateCard({ title, subtitle, ratios, onCreate }: { title: string; subtitle: string; ratios: string; onCreate?: ()=>void }) {
  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          <Badge variant="outline">{ratios}</Badge>
        </CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center text-slate-500">
          Aperçu {title}
        </div>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Brand Kit appliqué</li>
          <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Textes générés (Hook/Steps/CTA)</li>
          <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Planif dans Canva (client maître)</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={onCreate}>Créer {title}</Button>
      </CardFooter>
    </Card>
  );
}

function PriceCard({ title, price, bullets, cta, highlight }: { title: string; price: string; bullets: string[]; cta: string; highlight?: boolean }) {
  return (
    <Card className={`rounded-3xl ${highlight ? "border-slate-900 shadow-lg" : ""}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          {highlight && <Badge>Populaire</Badge>}
        </CardTitle>
        <CardDescription>
          <span className="text-3xl font-extrabold text-slate-900">{price}</span>
          <span className="text-slate-500"> / mois</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-slate-700">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-center gap-2"><Check className="h-4 w-4"/> {b}</li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full" variant={highlight ? "default" : "outline"}>{cta}</Button>
      </CardFooter>
    </Card>
  );
}
