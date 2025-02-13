import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY não está definida');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia'
});

export const PLANOS = {
  BRONZE: {
    id: process.env.STRIPE_BRONZE_PRICE_ID,
    preco: 990 // em centavos
  },
  PRATA: {
    id: process.env.STRIPE_PRATA_PRICE_ID,
    preco: 1990
  },
  GOLD: {
    id: process.env.STRIPE_GOLD_PRICE_ID,
    preco: 2990
  }
}; 