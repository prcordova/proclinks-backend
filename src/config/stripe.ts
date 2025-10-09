import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia'
});

export const PLANOS = {
  STARTER: {
    id: process.env.STRIPE_PRICE_STARTER_ID || 'price_starter_placeholder',
    name: 'STARTER',
    price: 4.99
  },
  PRO: {
    id: process.env.STRIPE_PRICE_PRO_ID || 'price_pro_placeholder',
    name: 'PRO',
    price: 29.99
  }
} as const;

// Função para validar variáveis de ambiente quando necessário
export function validateStripeConfig() {
  const requiredEnvVars = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PRICE_STARTER_ID: process.env.STRIPE_PRICE_STARTER_ID,
    STRIPE_PRICE_PRO_ID: process.env.STRIPE_PRICE_PRO_ID,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Configuração do Stripe incompleta. Variáveis faltando: ${missingVars.join(', ')}`
    );
  }
}
