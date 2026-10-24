import { Hono } from 'hono';
import { FavoritesHandlers } from '../domains/favorites/favorites.handlers';

export const createFavoritesRouter = (handlers = new FavoritesHandlers()) => {
  const router = new Hono();

  router.get('/favorites', (c) => handlers.list(c.req.raw));
  router.get('/favorites/ids', (c) => handlers.getFavoriteIds(c.req.raw));
  router.post('/favorites/toggle', (c) => handlers.toggle(c.req.raw));
  router.delete('/favorites/:productId', (c) => handlers.remove(c.req.raw, c.req.param('productId')));

  return router;
};
