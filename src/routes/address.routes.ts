import { Hono } from 'hono';
import { AddressHandlers } from '../domains/address/address.handlers';

export const createAddressRouter = (handlers = new AddressHandlers()) => {
  const router = new Hono();

  router.get('/addresses', (c) => handlers.list(c.req.raw));
  router.post('/addresses', (c) => handlers.create(c.req.raw));
  router.get('/addresses/lookup-cep/:cep', (c) => handlers.lookupCep(c.req.raw, c.req.param('cep')));
  router.all('/addresses/:id/default', (c) => handlers.setDefault(c.req.raw, c.req.param('id')));
  router.put('/addresses/:id', (c) => handlers.update(c.req.raw, c.req.param('id')));
  router.delete('/addresses/:id', (c) => handlers.delete(c.req.raw, c.req.param('id')));

  return router;
};
