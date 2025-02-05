import { Router } from 'express'
import { paymentController } from '../controllers/payment.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.post('/create-checkout-session', authMiddleware, paymentController.createCheckoutSession)
router.post('/webhook', paymentController.handleWebhook)

export default router 