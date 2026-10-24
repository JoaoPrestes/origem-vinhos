import { Hono } from 'hono';
import { PaymentHandlers } from '../domains/payment/payment.handlers';

export const createPaymentRouter = (handlers = new PaymentHandlers()) => {
  const router = new Hono();

  router.post('/payments', (c) => handlers.createPayment(c.req.raw));
  router.post('/payments/webhook', (c) => handlers.handleWebhook(c.req.raw));
  router.get('/payments/:id/status', (c) => handlers.getPaymentStatus(c.req.raw, c.req.param('id')));

  return router;
};
