import { Request, Response } from 'express'
import Stripe from 'stripe'
import { Payment } from '../models/payment.model'
import { User } from '../models/User'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const PLAN_PRICES = {
  BRONZE: {
    price: 1990, // R$ 19,90
    maxLinks: 5
  },
  SILVER: {
    price: 2990, // R$ 29,90
    maxLinks: 10
  },
  GOLD: {
    price: 4990, // R$ 49,90
    maxLinks: 50
  }
}

export const paymentController = {
  async createCheckoutSession(req: Request, res: Response) {
    try {
      const { planType } = req.body
      const userId = req.user.id

      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' })
      }

      // Criar ou recuperar cliente no Stripe
      let stripeCustomerId = user.plan.stripeCustomerId
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id
          }
        })
        stripeCustomerId = customer.id
        user.plan.stripeCustomerId = stripeCustomerId
        await user.save()
      }

      // Criar sessão de checkout
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: `Plano ${planType}`,
                description: `Até ${PLAN_PRICES[planType].maxLinks} links`
              },
              unit_amount: PLAN_PRICES[planType].price,
              recurring: {
                interval: 'month'
              }
            },
            quantity: 1
          }
        ],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        metadata: {
          userId,
          planType
        }
      })

      // Criar registro de pagamento
      await Payment.create({
        userId,
        planType,
        amount: PLAN_PRICES[planType].price,
        stripeSessionId: session.id,
        stripePaymentId: session.payment_intent as string
      })

      res.json({ url: session.url })
    } catch (error) {
      console.error('Erro ao criar sessão de pagamento:', error)
      res.status(500).json({ message: 'Erro ao processar pagamento' })
    }
  },

  async handleWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature']!
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        endpointSecret
      )

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          const userId = session.metadata?.userId
          const planType = session.metadata?.planType

          if (userId && planType) {
            const user = await User.findById(userId)
            if (user) {
              user.plan = {
                type: planType,
                status: 'ACTIVE',
                startDate: new Date(),
                expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string
              }
              await user.save()

              await Payment.findOneAndUpdate(
                { stripeSessionId: session.id },
                { 
                  status: 'COMPLETED',
                  updatedAt: new Date()
                }
              )
            }
          }
          break
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          const user = await User.findOne({
            'plan.stripeSubscriptionId': subscription.id
          })

          if (user) {
            user.plan.status = 'CANCELLED'
            await user.save()
          }
          break
        }
      }

      res.json({ received: true })
    } catch (error) {
      console.error('Erro no webhook:', error)
      res.status(400).send(`Webhook Error: ${error.message}`)
    }
  }
} 