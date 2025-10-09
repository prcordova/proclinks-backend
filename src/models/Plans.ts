export enum PlanType {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO'
}

export enum PlanStatus {
  INACTIVE = 'INACTIVE',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export interface PlanFeatures {
  maxLinks: number;
  customization: boolean;
  analytics: boolean;
  priority: boolean;
  support: 'basic' | 'priority' | 'vip';
  verifiedBadge: boolean;
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  FREE: {
    maxLinks: 3,
    customization: false,
    analytics: false,
    priority: false,
    support: 'basic',
    verifiedBadge: false
  },
  STARTER: {
    maxLinks: 10,
    customization: true,
    analytics: true,
    priority: false,
    support: 'priority',
    verifiedBadge: false
  },
  PRO: {
    maxLinks: 50,
    customization: true,
    analytics: true,
    priority: true,
    support: 'vip',
    verifiedBadge: true
  }
}

export const PLAN_PRICES: Record<PlanType, number> = {
  FREE: 0,
  STARTER: 4.99,
  PRO: 29.99
}
