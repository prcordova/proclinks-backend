import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY não está definida');
}

// Verificar todas as variáveis de ambiente necessárias
const requiredEnvVars = {
  STRIPE_PRICE_BRONZE_ID: process.env.STRIPE_PRICE_BRONZE_ID,
  STRIPE_PRICE_SILVER_ID: process.env.STRIPE_PRICE_SILVER_ID,
  STRIPE_PRICE_GOLD_ID: process.env.STRIPE_PRICE_GOLD_ID,
};

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`Variável de ambiente ${key} não está definida`);
  }
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia'
});

export const PLANOS = {
  BRONZE: {
    id: process.env.STRIPE_PRICE_BRONZE_ID!,
    name: 'BRONZE',
    price: 2.99
  },
  SILVER: {
    id: process.env.STRIPE_PRICE_SILVER_ID!,
    name: 'SILVER',
    price: 9.99
  },
  GOLD: {
    id: process.env.STRIPE_PRICE_GOLD_ID!,
    name: 'GOLD',
    price: 29.99
  }
} as const;