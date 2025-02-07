export enum PlanType {
  FREE = 'FREE',
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD'
}

export enum PlanStatus {
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
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  FREE: {
    maxLinks: 3,
    customization: false,
    analytics: false,
    priority: false,
    support: 'basic'
  },
  BRONZE: {
    maxLinks: 5,
    customization: true,
    analytics: false,
    priority: false,
    support: 'basic'
  },
  SILVER: {
    maxLinks: 10,
    customization: true,
    analytics: true,
    priority: false,
    support: 'priority'
  },
  GOLD: {
    maxLinks: 50,
    customization: true,
    analytics: true,
    priority: true,
    support: 'vip'
  }
} 