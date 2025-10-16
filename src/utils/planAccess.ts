import { SYSTEM_CONFIG } from '@/config/systemConfig';

type BasePlanKey = 'starter' | 'pro' | 'studio';
export type BrandTier = BasePlanKey;
export type PlanKey = 'none' | BasePlanKey | 'enterprise' | 'admin';

export type PlanFeature =
  | 'multiple_brands'
  | 'priority_support'
  | 'advanced_analytics'
  | 'woof_packs'
  | 'customer_portal'
  | 'unlimited_downloads';

export interface PlanQuotas {
  brands: number;
  visuals: number;
  videos: number;
  woofs: number;
}

export interface PlanAccess {
  key: PlanKey;
  label: string;
  description: string;
  quotas: PlanQuotas;
  features: PlanFeature[];
  brandDefaults: {
    tier: BrandTier;
    quotas: PlanQuotas;
  };
  priority: number;
}

const BASE_QUOTAS: Record<BasePlanKey, PlanQuotas> = {
  starter: {
    brands: 1,
    visuals: SYSTEM_CONFIG.QUOTAS.starter.images,
    videos: SYSTEM_CONFIG.QUOTAS.starter.videos,
    woofs: SYSTEM_CONFIG.QUOTAS.starter.woofs,
  },
  pro: {
    brands: 1,
    visuals: SYSTEM_CONFIG.QUOTAS.pro.images,
    videos: SYSTEM_CONFIG.QUOTAS.pro.videos,
    woofs: SYSTEM_CONFIG.QUOTAS.pro.woofs,
  },
  studio: {
    brands: 1,
    visuals: SYSTEM_CONFIG.QUOTAS.studio.images,
    videos: SYSTEM_CONFIG.QUOTAS.studio.videos,
    woofs: SYSTEM_CONFIG.QUOTAS.studio.woofs,
  },
};

const ENTERPRISE_QUOTAS: PlanQuotas = {
  brands: 10,
  visuals: 5000,
  videos: 500,
  woofs: 500,
};

const ADMIN_QUOTAS: PlanQuotas = {
  brands: 25,
  visuals: 10000,
  videos: 1000,
  woofs: 1000,
};

const PLAN_DEFINITIONS: Record<PlanKey, PlanAccess> = {
  none: {
    key: 'none',
    label: 'Aucun plan',
    description: "Aucun abonnement actif",
    quotas: { brands: 0, visuals: 0, videos: 0, woofs: 0 },
    features: [],
    brandDefaults: {
      tier: 'starter',
      quotas: BASE_QUOTAS.starter,
    },
    priority: 0,
  },
  starter: {
    key: 'starter',
    label: 'Starter',
    description: 'Accès essentiel pour 1 marque',
    quotas: BASE_QUOTAS.starter,
    features: ['unlimited_downloads', 'customer_portal'],
    brandDefaults: {
      tier: 'starter',
      quotas: BASE_QUOTAS.starter,
    },
    priority: 1,
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    description: 'Accès avancé avec support prioritaire',
    quotas: BASE_QUOTAS.pro,
    features: ['unlimited_downloads', 'customer_portal', 'priority_support', 'multiple_brands'],
    brandDefaults: {
      tier: 'pro',
      quotas: BASE_QUOTAS.pro,
    },
    priority: 2,
  },
  studio: {
    key: 'studio',
    label: 'Studio',
    description: 'Quotas étendus et analytics avancés',
    quotas: BASE_QUOTAS.studio,
    features: [
      'unlimited_downloads',
      'customer_portal',
      'priority_support',
      'multiple_brands',
      'advanced_analytics',
      'woof_packs',
    ],
    brandDefaults: {
      tier: 'studio',
      quotas: BASE_QUOTAS.studio,
    },
    priority: 3,
  },
  enterprise: {
    key: 'enterprise',
    label: 'Enterprise',
    description: 'Accès illimité et support dédié',
    quotas: ENTERPRISE_QUOTAS,
    features: [
      'unlimited_downloads',
      'customer_portal',
      'priority_support',
      'multiple_brands',
      'advanced_analytics',
      'woof_packs',
    ],
    brandDefaults: {
      tier: 'studio',
      quotas: ENTERPRISE_QUOTAS,
    },
    priority: 4,
  },
  admin: {
    key: 'admin',
    label: 'Admin',
    description: 'Accès complet administrateur',
    quotas: ADMIN_QUOTAS,
    features: [
      'unlimited_downloads',
      'customer_portal',
      'priority_support',
      'multiple_brands',
      'advanced_analytics',
      'woof_packs',
    ],
    brandDefaults: {
      tier: 'studio',
      quotas: ADMIN_QUOTAS,
    },
    priority: 5,
  },
};

export function resolvePlanKey(rawPlan: string | null | undefined, roles: string[]): PlanKey {
  if (roles.includes('admin')) {
    return 'admin';
  }

  const normalized = (rawPlan || 'none').toLowerCase() as PlanKey;
  if (normalized in PLAN_DEFINITIONS) {
    return normalized;
  }

  return 'none';
}

export function getPlanAccess(plan: PlanKey): PlanAccess {
  return PLAN_DEFINITIONS[plan] ?? PLAN_DEFINITIONS.none;
}

export function planHasFeature(plan: PlanAccess, feature: PlanFeature): boolean {
  return plan.features.includes(feature);
}

export function getPlanLabel(plan: PlanKey): string {
  return PLAN_DEFINITIONS[plan]?.label ?? PLAN_DEFINITIONS.none.label;
}

export function getPlanPriority(plan: PlanKey): number {
  return PLAN_DEFINITIONS[plan]?.priority ?? 0;
}
