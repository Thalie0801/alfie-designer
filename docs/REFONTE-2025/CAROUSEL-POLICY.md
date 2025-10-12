# Politique « Carrousel propre »
- **FR par défaut** (`locale=fr-FR`)
- **Slides distincts** : cover → 3 points → CTA (4–6 au total)
- **Interdit** : collages/grilles (2×2, 3×3, etc.), texte rasterisé dans l'image
- **Texte via template** Canva → comptage : slides purement typo = **0 image**
- **Livraison** : PULL (Ouvrir dans Canva) + ZIP structuré (`slides/slide-01.png…`, `metadata/alt_texts.json`)

## Comment le worker doit se comporter
1) Lire `deliverable.meta` :
   ```json
   { "locale":"fr-FR","slidesWanted":5,"banCollageGrids":true,"suppressTextInImages":true,"templateFirst":true }
   ```
2) Produire **N slides** (PNG) et renseigner `meta.slides=[ "…/slide-01.png", … ]`.
3) **Ne jamais** renvoyer une image unique à découper.

## Garde livraison
Si le carrousel n'est pas multi‑slides, `/v1/creations/:id/deliver` retourne **409 `not_multislide`**
au lieu de livrer un collage. Ré‑enquêter la génération selon la politique.

_Réf. cahier des charges : structure des carrousels, FR par défaut, PULL‑only, alt‑texts, comptage._ ✔
