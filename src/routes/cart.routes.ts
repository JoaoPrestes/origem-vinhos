import { Hono } from 'hono';
import { CartHandlers } from '../domains/cart/cart.handlers';

export const createCartRouter = (handlers = new CartHandlers()) => {
  const router = new Hono();

  router.get('/cart', (c) => handlers.getCart(c.req.raw));
  router.post('/cart', (c) => handlers.addItem(c.req.raw));
  router.delete('/cart', (c) => handlers.clear(c.req.raw));
  router.put('/cart/:itemId', (c) => handlers.updateItemQuantity(c.req.raw, c.req.param('itemId')));
  router.delete('/cart/:itemId', (c) => handlers.removeItem(c.req.raw, c.req.param('itemId')));

  return router;
};
