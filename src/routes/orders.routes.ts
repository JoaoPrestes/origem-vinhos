import { Hono } from 'hono';
import { OrdersHandlers } from '../domains/orders/orders.handlers';

export const createOrdersRouter = (handlers = new OrdersHandlers()) => {
  const router = new Hono();

  router.get('/orders', (c) => handlers.listOrders(c.req.raw));
  router.post('/orders', (c) => handlers.createOrder(c.req.raw));
  router.all('/orders/:id/cancel', (c) => handlers.cancelOrder(c.req.raw, c.req.param('id')));
  router.get('/orders/:id', (c) => handlers.getOrderDetails(c.req.raw, c.req.param('id')));

  return router;
};
