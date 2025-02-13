import { Request, Response, RequestHandler } from 'express';
import { stripe, PLANOS } from '../config/stripe';
import { User } from '../models/User';
 

export class PaymentsController {
  createCheckoutSession: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { plano } = req.body;
      const userId = (req as any).user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      let stripeCustomerId = user.plan.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user._id.toString()
          }
        });
        stripeCustomerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        line_items: [
          {
            price: PLANOS[plano as keyof typeof PLANOS].id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: '/planos/sucesso?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: '/planos',
        metadata: {
          userId: user._id.toString(),
          plano: plano
        }
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Erro ao criar sessão de checkout:', error);
      res.status(500).json({ error: 'Erro ao processar pagamento' });
    }
  }

  webhookStripe: RequestHandler = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        webhookSecret as string
      );

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const userId = session.metadata.userId;
          const plano = session.metadata.plano;

          await User.findByIdAndUpdate(userId, {
            'plan.type': plano,
            'plan.status': 'ACTIVE',
            'plan.startDate': new Date(),
            'plan.stripeCustomerId': session.customer,
            'plan.stripeSubscriptionId': session.subscription,
            'plan.expirationDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
          });
          break;
        }

        case 'invoice.payment_succeeded': {
          // Renovação mensal
          const invoice = event.data.object as any;
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const userId = subscription.metadata.userId;

          await User.findByIdAndUpdate(userId, {
            'plan.status': 'ACTIVE',
            'plan.expirationDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          });
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as any;
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const userId = subscription.metadata.userId;

          await User.findByIdAndUpdate(userId, {
            'plan.status': 'INACTIVE'
          });
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          const userId = subscription.metadata.userId;

          await User.findByIdAndUpdate(userId, {
            'plan.type': 'FREE',
            'plan.status': 'INACTIVE',
            'plan.expirationDate': new Date(),
            'plan.stripeSubscriptionId': null
          });
          break;
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Erro no webhook:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      res.status(400).send(`Webhook Error: ${errorMessage}`);
    }
  }

  cancelMonthlySubscription: RequestHandler = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const user = await User.findById(userId);

      if (!user?.plan.stripeSubscriptionId) {
        return res.status(400).json({ error: 'Nenhuma assinatura ativa' });
      }

      await stripe.subscriptions.cancel(user.plan.stripeSubscriptionId);

      await User.findByIdAndUpdate(userId, {
        'plan.type': 'FREE',
        'plan.status': 'INACTIVE',
        'plan.expirationDate': new Date(),
        'plan.stripeSubscriptionId': null
      });

      res.json({ message: 'Assinatura cancelada com sucesso' });
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      res.status(500).json({ error: 'Erro ao cancelar assinatura' });
    }
  }
} 