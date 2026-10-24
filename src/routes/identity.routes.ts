import { Hono } from 'hono';
import { IdentityHandlers } from '../domains/identity/identity.handlers';

export const createIdentityRouter = (handlers = new IdentityHandlers()) => {
  const router = new Hono();

  router.post('/register', (c) => handlers.register(c.req.raw));
  router.post('/login', (c) => handlers.login(c.req.raw));
  router.post('/logout', (c) => handlers.logout(c.req.raw));
  router.get('/me', (c) => handlers.getProfile(c.req.raw));
  router.put('/me', (c) => handlers.updateProfile(c.req.raw));
  router.delete('/me', (c) => handlers.deleteAccount(c.req.raw));

  return router;
};
