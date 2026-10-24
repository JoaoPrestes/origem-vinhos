import { Hono } from 'hono';
import { CatalogHandlers } from '../domains/catalog/catalog.handlers';
import { handleFileUpload } from '../domains/catalog/upload.handlers';

export const createCatalogRouter = (handlers = new CatalogHandlers()) => {
  const router = new Hono();

  // Upload
  router.post('/upload', (c) => handleFileUpload(c.req.raw));

  // Chat RAG Sommelier
  router.all('/chat', (c) => handlers.chat(c.req.raw));

  // Catalog CRUD
  router.get('/catalog', (c) => handlers.list(c.req.raw));
  router.post('/catalog', (c) => handlers.create(c.req.raw));
  router.get('/catalog/:id', (c) => handlers.getDetail(c.req.raw, c.req.param('id')));
  router.put('/catalog/:id', (c) => handlers.update(c.req.raw, c.req.param('id')));
  router.delete('/catalog/:id', (c) => handlers.delete(c.req.raw, c.req.param('id')));

  return router;
};
