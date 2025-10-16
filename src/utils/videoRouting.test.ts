import { describe, expect, it } from 'bun:test';

import {
  SORA_WOOF_FACTOR,
  VEO3_WOOF_FACTOR,
  detectVideoStyle,
  estimateVideoDuration,
  routeVideoEngine,
} from './videoRouting';

describe('routeVideoEngine', () => {
  it('chooses Sora for formats courts type reel', () => {
    const decision = routeVideoEngine({ seconds: 8, style: 'reel', remainingWoofs: 10 });

    expect(decision.engine).toBe('sora');
    expect(decision.woofCost).toBe(SORA_WOOF_FACTOR);
    expect(decision.reason).toContain('Sora');
    expect(decision.reason).toContain('reel');
  });

  it('chooses Veo 3 for long cinematic clips with budget', () => {
    const decision = routeVideoEngine(
      { seconds: 15, style: 'cinématique', remainingWoofs: 12 },
      { veo3Enabled: true }
    );

    expect(decision.engine).toBe('veo3');
    expect(decision.woofCost).toBe(VEO3_WOOF_FACTOR);
    expect(decision.reason).toContain('Veo 3');
    expect(decision.reason).toContain('durée');
  });

  it('falls back to Sora when Veo budget missing', () => {
    const decision = routeVideoEngine(
      { seconds: 18, style: 'ads', remainingWoofs: 2 },
      { veo3Enabled: true }
    );

    expect(decision.engine).toBe('sora');
    expect(decision.reason).toContain('Budget Woofs insuffisant');
  });

  it('falls back to Sora when Veo is feature-flagged off', () => {
    const decision = routeVideoEngine({ seconds: 16, style: 'cinématique', remainingWoofs: 10 });

    expect(decision.engine).toBe('sora');
    expect(decision.reason).toContain('Feature flag Veo 3 désactivé');
  });

  it('forces Sora when quotas exhausted', () => {
    const decision = routeVideoEngine({ seconds: 6, style: 'standard', remainingWoofs: 0 });

    expect(decision.engine).toBe('sora');
    expect(decision.reason.toLowerCase()).toContain('hard-stop');
  });
});

describe('estimateVideoDuration', () => {
  it('parses explicit seconds from prompt', () => {
    expect(estimateVideoDuration('Crée une vidéo de 12 secondes sur notre produit')).toBe(12);
  });

  it('infers duration from keywords', () => {
    expect(estimateVideoDuration('Un teaser court pour instagram')).toBe(5);
    expect(estimateVideoDuration('Un film long et détaillé')).toBe(15);
  });
});

describe('detectVideoStyle', () => {
  it('detects cinematic style', () => {
    expect(detectVideoStyle('Ambiance cinéma, très cinematic')).toBe('cinématique');
  });

  it('defaults to standard', () => {
    expect(detectVideoStyle('Un format éducatif simple')).toBe('standard');
  });
});
