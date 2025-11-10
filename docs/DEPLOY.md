# Déploiement Canary & Feature Flags

- **Variables canary** : définir `VITE_IS_CANARY=1` avec quotas réduits et logs verbeux pour l'environnement Render/Lovable.
- **Flags de fonctionnalités** : exposés via `src/config/flags.ts`. Tous les environnements doivent définir `VITE_FLAG_CANVA_CONNECT=0` et `VITE_FLAG_ZAPIER_BRIDGE=0` par défaut. Activer un flag en le passant à `1` après validation manuelle.
- **Pipeline qualité** : chaque incrément doit respecter `npm ci && npm run typecheck && npm run lint && npm run build` avant promotion.
- **Canary rollout** : activer les flags un par un, vérifier les métriques, puis promouvoir sur `stable/morning-2025-11-10` via PR.
- **Rollback** : revenir au tag `baseline-2025-11-10` en cas de régression (`git checkout baseline-2025-11-10` puis redéployer).
