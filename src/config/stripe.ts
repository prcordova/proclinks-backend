import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY não está definida');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia'
});

export const PLANOS = {
  BRONZE: {
    id: 'price_1QrsXUIgj86kFVX92m3vDmVu',
    name: 'Bronze',
    price: 29.90
  },
  SILVER: {
    id: 'price_1QrsY1Igj86kFVX9l0VRRQ83',
    name: 'Silver',
    price: 49.90
  },
  GOLD: {
    id: 'price_1QrsYjIgj86kFVX9qT0jIuKK',
    name: 'Gold',
    price: 99.90
  }
}; 