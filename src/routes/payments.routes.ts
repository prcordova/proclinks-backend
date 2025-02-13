import { Router } from 'express';
import { PaymentsController } from '../controllers/payments.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import express from 'express';
import { RequestHandler } from 'express';

const router = Router();
const paymentsController = new PaymentsController();

// Create checkout session
router.post('/create-checkout', authMiddleware, paymentsController.createCheckoutSession as RequestHandler);

// Stripe webhook (no auth needed)
router.post('/webhook', 
  express.raw({type: 'application/json'}),
  paymentsController.webhookStripe as RequestHandler
);

// Cancel subscription
router.post('/cancel-subscription', authMiddleware, paymentsController.cancelMonthlySubscription as RequestHandler);

export { router as paymentsRoutes }; 