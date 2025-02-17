import { Request, Response, RequestHandler } from 'express';
import { stripe, PLANOS } from '../config/stripe';
import { User } from '../models/User';
 

export class PaymentsController {
  createCheckoutSession: RequestHandler = async (req: Request, res: Response) => {
    try {
      if (!process.env.FRONTEND_URL) {
        throw new Error('FRONTEND_URL não está configurada');
      }

      const { plano } = req.body;
      console.log('Plano recebido:', plano);
      console.log('Planos disponíveis:', PLANOS);

      // Verifica se o plano é válido
      const planConfig = PLANOS[plano as keyof typeof PLANOS];
      if (!planConfig) {
        console.error('Configuração de plano inválida:', {
          planoRecebido: plano,
          planosDisponiveis: Object.keys(PLANOS)
        });
        return res.status(400).json({ error: `Plano inválido: ${plano}` });
      }

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
        
        // Atualiza o stripeCustomerId do usuário
        await User.findByIdAndUpdate(userId, {
          'plan.stripeCustomerId': customer.id
        });
      }

      const sessionData = {
        customer: stripeCustomerId,
        line_items: [{
          price: planConfig.id,
          quantity: 1
        }],
        mode: 'subscription' as const,
        success_url: `${process.env.FRONTEND_URL}/planos/sucesso?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/planos`,
        metadata: {
          userId: user._id.toString(),
          plano: plano
        }
      };

      console.log('Dados da sessão de checkout:', sessionData);

      const session = await stripe.checkout.sessions.create(sessionData);

      console.log('Sessão criada com sucesso:', {
        sessionId: session.id,
        url: session.url
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Erro ao criar sessão de checkout:', error);
      console.error('Detalhes do erro:', {
        plano: req.body.plano,
        planosDisponiveis: Object.keys(PLANOS)
      });
      res.status(500).json({ 
        error: 'Erro ao processar pagamento',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  webhookStripe: RequestHandler = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
      if (!sig || !webhookSecret) {
        console.error('Webhook Error: Faltando signature ou webhook secret');
        return res.status(400).json({ error: 'Configuração do webhook inválida' });
      }

      console.log('Recebendo webhook do Stripe');
      console.log('Signature:', sig);
      console.log('Body type:', typeof req.body);
      console.log('Body é Buffer?', Buffer.isBuffer(req.body));

      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );

      console.log('Evento do Stripe:', {
        type: event.type,
        data: event.data.object
      });

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const userId = session.metadata.userId;
          const plano = session.metadata.plano;

          console.log('Atualizando plano do usuário:', {
            userId,
            plano,
            session
          });

          if (!['BRONZE', 'SILVER', 'GOLD'].includes(plano)) {
            throw new Error(`Tipo de plano inválido: ${plano}`);
          }

          await User.findByIdAndUpdate(userId, {
            'plan.type': plano,
            'plan.status': 'ACTIVE',
            'plan.startDate': new Date(),
            'plan.stripeCustomerId': session.customer,
            'plan.stripeSubscriptionId': session.subscription,
            'plan.expirationDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          });

          console.log('Plano atualizado com sucesso:', {
            tipo: plano,
            status: 'ACTIVE',
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          });
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as any;
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const userId = subscription.metadata.userId;
          const plano = subscription.metadata.plano;

          await User.findByIdAndUpdate(userId, {
            'plan.status': 'ACTIVE',
            'plan.type': plano,
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

          console.log('Assinatura finalizada, convertendo para FREE:', {
            userId,
            subscriptionId: subscription.id
          });

          await User.findByIdAndUpdate(userId, {
            'plan.type': 'FREE',
            'plan.status': 'INACTIVE',
            'plan.expirationDate': new Date(),
            'plan.stripeSubscriptionId': null
          });

          console.log('Usuário convertido para plano FREE');
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as any;
          if (subscription.cancel_at_period_end && subscription.status === 'active') {
            const userId = subscription.metadata.userId;
            
            console.log('Assinatura será cancelada ao fim do período:', {
              userId,
              expirationDate: new Date(subscription.current_period_end * 1000)
            });
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Erro detalhado no webhook:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        bodyType: typeof req.body,
        isBuffer: Buffer.isBuffer(req.body),
        signature: sig,
        hasWebhookSecret: !!webhookSecret
      });
      
      return res.status(400).json({ 
        error: 'Webhook Error',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  cancelMonthlySubscription: RequestHandler = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const user = await User.findById(userId);

      if (!user?.plan.stripeSubscriptionId) {
        return res.status(400).json({ error: 'Nenhuma assinatura ativa' });
      }

      // Recupera a assinatura do Stripe para obter o período atual
      const subscription = await stripe.subscriptions.retrieve(user.plan.stripeSubscriptionId);
      
      // Cancela a assinatura no final do período
      await stripe.subscriptions.update(user.plan.stripeSubscriptionId, {
        cancel_at_period_end: true
      });

      // Atualiza o usuário mantendo acesso até o final do período
      await User.findByIdAndUpdate(userId, {
        'plan.status': 'CANCELLED',
        'plan.expirationDate': new Date(subscription.current_period_end * 1000), // Converte timestamp para Date
      });

      console.log('Assinatura cancelada:', {
        userId,
        subscriptionId: user.plan.stripeSubscriptionId,
        expirationDate: new Date(subscription.current_period_end * 1000)
      });

      res.json({ 
        message: 'Assinatura cancelada com sucesso',
        expirationDate: new Date(subscription.current_period_end * 1000)
      });
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      res.status(500).json({ error: 'Erro ao cancelar assinatura' });
    }
  }
} 