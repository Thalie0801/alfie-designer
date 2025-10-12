# Alfie Designer — Cahier des charges de refonte (2024)

## 0. Cap à retenir (leitmotiv)
- **PULL only** : aucun push automatique vers Canva. Chaque livraison = lien « Ouvrir dans Canva » + ZIP téléchargeable.
- **One-prompt** : invite unique « Fais-moi un [Image | Carrousel | Reel 9:16] pour … » suivie de 2–3 questions ciblées maximum.
- **0 Woof par défaut** : pipelines Image→Vidéo et Éco T2V sont utilisés systématiquement. Les moteurs Premium (Veo/Sora) ne s’activent qu’après confirmation explicite du client.
- **Offres inchangées** : Starter 39 €, Pro 99 €, Studio 199 € avec les quotas actuels Images/Reels/Woofs.

Ces principes doivent être rappelés dans l’interface, la documentation client et les cérémonies produit.

---

## 1. Contexte & objectifs
1. **Mutation produit** : Alfie Designer devient un agent conversationnel autonome qui fabrique à la demande **Images**, **Carrousels** et **Reels 9:16** en exploitant soit des templates Canva, soit des moteurs IA propriétaires.
2. **Expérience visée** : parcours réduit à l’essentiel — « Fais-moi un… » → 2–3 questions → aperçu → livraison PULL. Aucun changement sur la landing marketing publique existante.
3. **Maîtrise des coûts** : privilégier les moteurs internes 0 Woof. Les plans Premium ne sont déclenchés qu’après accord. Indicateur clé : ≥85 % des vidéos livrées sans Woof.
4. **Clarté commerciale** : conserver les prix et quotas actuels, afficher les compteurs et alerter dès 80 % de consommation.
5. **Préparer Æditus** : structurer les APIs et packaging pour une future orchestration/publication sans l’implémenter dans ce scope.

---

## 2. Périmètre & hors périmètre
### 2.1 Formats servis (in scope)
- **Image fixe** : ratio 1:1 ou 4:5, export PNG ≥1080 px + SVG source.
- **Carrousel IG/LinkedIn** : 5–7 slides, exports PNG, PDF, SVG par slide.
- **Reel / vidéo courte 9:16** : 8–15 s, livrée en MP4 + SRT + cover.

### 2.2 Entrées acceptées
- Invite texte (option audio → transcription).
- Brand Kit (palette, typos, logos, safe-zones, StyleDNA).
- Médias fournis : 0–5 images (PNG/JPG) et/ou courts clips.
- Choix de route : `template`, `ia` ou `auto`.

### 2.3 Livrables
- Lien **« Ouvrir dans Canva »** (mode PULL, jamais de push).
- ZIP structuré (cf. §5) contenant rendus + métadonnées `delivery.json`.
- Prévisualisations via URL signée 15 min (storyboard, contact sheet, player vidéo).

### 2.4 Hors scope
- Publication/planification sociale, push Canva, vidéos >60 s ou 4K, effets VFX lourds, analytics externes avancés, intégration Æditus.

---

## 3. Offres, quotas & facturation
### 3.1 Plans (inchangés)
| Plan    | Prix | Images/mois | Reels/mois (0 Woof) | Woofs Premium inclus | Notes |
|---------|------|-------------|---------------------|----------------------|-------|
| Starter | 39 € | 150         | 15                  | 0                    | Brand Kit appliqué, 1 version par demande |
| Pro     | 99 € | 450         | 45                  | 5                    | Variantes A/B, déclinaisons pertinentes |
| Studio  |199 € | 1000        | 100                 | 15                   | Packs multi-canaux, composants de marque |

### 3.2 Add-ons & règles
- Marque supplémentaire +39 €/mois ; Packs Woofs (+5/+10) ; Stockage 90 j +9 €/marque.
- Comptage : chaque image IA = 1 quota, carrousels comptent les visuels IA, reels = 1 export, Woofs jamais consommés sans confirmation.
- Compteurs décrémentés **à la livraison** uniquement. Alerte à 80 % (in-app + email).

---

## 4. Architecture MVP
- **Front** : Next.js + TypeScript. Pages : `NewPrompt`, `Preview`, `Delivery`, `Pricing`. Afficher en permanence les rappels Cap à retenir.
- **API (Node/TS)** : endpoints `/jobs`, `/render`, `/assets`, `/account/quotas`.
- **Workers (queue)** : `image_gen`, `layout_canva`, `video_eco`, `video_premium`, `packager`.
- **Storage** : S3 pour rendus, DynamoDB ou PostgreSQL pour jobs/quotas, Redis pour queue & locks.
- **CDN** : CloudFront pour diffuser previews/ZIP.
- **Secrets** : `NANO_BANANA_KEY`, `T2V_ECO_KEY`, `T2V_VEO_KEY`, `T2V_SORA_KEY` (stockés via vault + rotations trimestrielles).
- **Observabilité** : logs structurés (JSON), traces (OpenTelemetry), métriques worker (temps job, coûts).

---

## 5. Flux « one-prompt » unifié
### 5.1 Création de job
```http
POST /jobs
Content-Type: application/json
{
  "format": "image|carousel|reel",
  "brief": "texte libre",
  "brandKitId": "bk_123",
  "assets": ["s3://bucket/img1.png"],
  "route": "template|ia|auto",
  "planId": "starter|pro|studio"
}
```

### 5.2 Routage
- Si `assets` ≥ 1 :
  - Image/Carrousel → `layout_canva` (ou fallback IA).
  - Reel → `video_eco` en mode Image→Vidéo.
- Si `route:auto` : tenter template ; faute de match, basculer IA.
- Si Reel avec contrainte « réaliste/ciné » détectée → proposer Premium (cf. §8).

### 5.3 Génération & preview
- **Image** : `nanoBanana.generateImage` → `layout_canva` → export PNG + SVG.
- **Carrousel** : moteur de pagination (grilles, marges, typo) → PNG+PDF+SVG.
- **Reel 0 Woof** :
  - `videoEco.fromImages` (Ken Burns / Parallax / Montage) si assets.
  - `videoEco.t2v` (8–12 s, SRT, cover) sinon.
- Preview : URL signée 15 min via S3 + CloudFront.

### 5.4 Livraison
- Génération `delivery.json` + ZIP structuré (cf. §6).
- Boutons : « Ouvrir dans Canva » (PULL), « Télécharger le ZIP », « Dupliquer la demande ».
- Décrément quotas (images, reels, woofs) après livraison réussie.

---

## 6. Packaging & structure ZIP
```
YYYY-MM/Brand/Format_Titre/
  delivery.json
  README.txt
  image/ | carousel/ | reel/
    # image
    post.png
    post.svg
    # carousel
    slides/slide-01.png … slide-07.png
    slides.svg/
    export.pdf
    # reel
    reel.mp4
    reel.srt
    cover.png
```

### 6.1 Fichier `delivery.json` (exemple)
```json
{
  "format": "reel",
  "title": "Annonce SEO",
  "ratio": "9:16",
  "cta": "Réserver un audit",
  "canva": {"mode": "pull", "link": "https://canva.com/design/..."},
  "altTexts": ["slide1 ...", "slide2 ..."],
  "captions": {"short": "...", "long": "..."},
  "utm": {"source": "ig", "campaign": "seo-q4"},
  "checks": {"contrast": "AA", "safeZone": true, "subsLines<=2": true}
}
```

README.txt rappelle PULL only, quotas consommés, délais de purge.

---

## 7. Modèles de données (schéma rapide)
```ts
BrandKit {
  id: string
  name: string
  palette: Color[]
  fonts: FontSpec[]
  logoUrl: string
  safeZones: SafeZoneSpec
  styleDNA: Record<string, any>
}

Job {
  id: string
  userId: string
  format: 'image'|'carousel'|'reel'
  brief: string
  route: 'template'|'ia'|'auto'|'premium'
  status: 'created'|'routing'|'rendering'|'preview_ready'|'delivered'|'failed'
  brandKitId: string
  assets: string[]
  cost: { images: number; reels: number; woofs: number }
  outputs: { previewUrl?: string; zipUrl?: string; canvaLink?: string }
  createdAt: Date
  updatedAt: Date
}

Quota {
  userId: string
  plan: 'starter'|'pro'|'studio'
  imagesRemaining: number
  reelsRemaining: number
  woofsRemaining: number
  resetAt: Date
}

Journal {
  jobId: string
  action: 'premium_prompted'|'premium_confirmed'|'fallback_eco'
  woofsUsed?: number
  createdAt: Date
}
```

---

## 8. Garde-fous Woofs & premium
1. **Détection** : route `premium` explicite ou mention réaliste/ciné → modale front.
2. **Modale** : affiche coût (2–4 Woofs), solde restant, rappel PULL only.
3. **Endpoint** : `POST /jobs/:id/confirm-premium` → consomme Woofs, déclenche worker `video_premium`.
4. **Timeout** : sans confirmation sous 15 min → fallback automatique `video_eco` (journaliser `fallback_eco`).
5. **Traçabilité** : événements `premium_prompted`, `premium_confirmed` avec userId, timestamp, Woofs utilisés.

Jamais consommer de Woofs sans confirmation tracée.

---

## 9. Recherche de templates Canva
- Index JSON local `{ id, format, ratios, minText, maxText, slots, thumb }` maintenu par design.
- Matching heuristique : ratio, mood (promo/pédago/teaser), densité texte.
- Remplissage automatique :
  - Titres/sous-titres/CTA selon brief.
  - Couleurs mappées sur `BrandKit.palette` (fallback neutre).
  - Typographies : substitution si police manquante.
- Si échec (pas de match ou import invalide) → fallback IA (Nano-Banana) + signalement.

---

## 10. Adaptateurs moteurs
```ts
nanoBanana.generateImage(prompt | image, brandKit) => { png, svg, seed }
videoEco.fromImages(images[], style: 'kenburns'|'parallax'|'montage') => { mp4, srt, cover }
videoEco.t2v(brief, brandKit) => { mp4, srt, cover }
videoPremium.generate(brief) => { mp4 } // bloqué tant que non confirmé
```
- Prévoir retries + timeouts (60 s image, 180 s vidéo premium).
- Stocker seeds pour reproductibilité.

---

## 11. Règles qualité automatisées
- **Texte** : 38–55 car/ligne, taille ≥12 px, contraste AA vérifié.
- **Images** : absence d’artefacts majeurs, alignement Brand Kit, alt-text généré puis éditable.
- **Vidéo** : 5–7 beats, durée 8–12 s, sous-titres ≤2 lignes, loudness −14 LUFS ±1, safe zones 9:16.
- **Checklists** : orthographe FR/EN, overlays safe-zone IG 4:5 & 9:16, validation avant livraison (garder trace dans `delivery.json`).

---

## 12. Gestion des erreurs & fallbacks
- Échec template Canva → reroute `ia` automatiquement.
- Échec Nano-Banana → fallback placeholder typographique (marqué) + notification.
- Échec `videoEco.t2v` → proposer `videoEco.fromImages` si assets présents, sinon informer utilisateur.
- Échec premium → rebasculer Éco, restituer Woofs si consommation partielle.
- Toujours livrer un livrable (même simplifié) ou explication claire + options.

---

## 13. Suivi, métriques & analytics
- **Événements (PostHog/Segment)** : `prompt_started`, `template_matched`, `nb_images_generated`, `eco_video_done`, `premium_prompted`, `premium_confirmed`, `delivered`, `zip_downloaded`.
- **KPI internes** : % vidéos 0 Woof, % jobs validés first-pass, temps moyen preview, taux recours Premium (<15 %), satisfaction post-livraison ≥4/5.
- Dashboards : temps réel pour support + hebdo produit.

---

## 14. Sécurité, conformité & stockage
- Scan automatique contenus interdits (nudité, logos tiers non autorisés).
- Checkbox de garantie droits sur médias importés + log.
- URLs S3 signées (expirent 15 min preview, 7 jours ZIP), chiffrement at-rest + in-transit.
- Conservation rendus 30 jours (S3 Lifecycle) ; option 90 jours via add-on.
- Export ZIP 1 clic avant purge, traces de téléchargement.
- RGPD : anonymisation prompts dans logs, suppression sur demande, registre traitements.

---

## 15. Feature flags (progressive delivery)
- `ff.template_canva` : ON par défaut.
- `ff.nano_banana` : ON.
- `ff.video_eco_t2v` : ON.
- `ff.video_premium` : OFF (activer au compte à compte).
- `ff.studio_multicanal` : OFF initialement (débloque déclinaisons supplémentaires).

---

## 16. Découpage en 2 sprints (bi-hebdo)
### Sprint 1 — MVP Image & Carrousel
- Implémenter `/jobs`, router, `image_gen`, `layout_canva`.
- Intégrer Nano-Banana pour images, exporter PNG/PDF/SVG.
- Mettre en place BrandKit, templates, preview, ZIP, quotas images.
- Pages Front : `NewPrompt`, `Preview`, `Delivery`, `Pricing` (landing marketing inchangée).
- DoD : 1 image + 1 carrousel livrés avec lien Canva + ZIP, quotas décrémentés correctement.

### Sprint 2 — Reels 0 Woof & Premium
- Pipelines `videoEco.fromImages` + `videoEco.t2v` (SRT, cover).
- Modale Woofs + endpoint `confirm-premium`, quotas reels/woofs.
- Check qualité vidéo, enrichir `delivery.json`, instrumentation métriques.
- DoD : 1 reel Éco livré ; premium proposé, confirmé, journalisé ; quotas alignés.

---

## 17. Landing page (dev) — rappel
- Ne pas toucher à la landing marketing existante hors badges suivants : « Import Canva (PULL) », « Reels inclus = 0 Woof », « Premium possible (Woofs) », « Aucune publication automatique ».
- Composants : Hero, Steps, Formats, Offres, FAQ, CTA. CTAs dirigent vers `NewPrompt?format=image|carousel|reel`.
- Mettre en avant le one-prompt, la rapidité (<2 min image, <5 min reel Éco) et les quotas inchangés.

---

## 18. Critères d’acceptation clés
1. **Woofs** : jamais consommés sans confirmation (événement traçable + journal).
2. **Livrables** : chaque job fournit au minimum une preview valide, un ZIP structuré et un lien Canva (PULL only).
3. **Quotas** : décrémentés à la livraison, visibles sur dashboard, alertes 80 %.
4. **Qualité** : checkers contraste/safe-zone/sous-titres au vert avant livraison.
5. **Expérience** : parcours unique « Fais-moi un… », 2–3 questions, preview <2/5 min selon format.
6. **Sécurité** : contenus scannés, URLs signées, stockage 30 j (90 j si add-on), logs conformité RGPD.

---

## 19. Roadmap post-refonte (indicative)
1. **Push Canva** (si API s’ouvre) en add-on optionnel.
2. **Analytics créatifs (V2)** : variété/novelty, couverture thématique.
3. **Extensions médias** : voix off TTS, export Lottie, nouveaux formats (Stories, Shorts horizontaux).
4. **Pont Æditus** : orchestrations multi-publications, calendrier éditorial.

