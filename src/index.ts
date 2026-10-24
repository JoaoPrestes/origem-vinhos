import { Hono } from 'hono';
import { IdentityHandlers } from './domains/identity/identity.handlers';
import { CatalogHandlers } from './domains/catalog/catalog.handlers';
import { CartHandlers } from './domains/cart/cart.handlers';
import { AddressHandlers } from './domains/address/address.handlers';
import { FavoritesHandlers } from './domains/favorites/favorites.handlers';
import { OrdersHandlers } from './domains/orders/orders.handlers';
import { PaymentHandlers } from './domains/payment/payment.handlers';
import { startCatalogIngestionWorker } from './workers/catalog-ingestion.worker';

import { createIdentityRouter } from './routes/identity.routes';
import { createCatalogRouter } from './routes/catalog.routes';
import { createCartRouter } from './routes/cart.routes';
import { createAddressRouter } from './routes/address.routes';
import { createFavoritesRouter } from './routes/favorites.routes';
import { createOrdersRouter } from './routes/orders.routes';
import { createPaymentRouter } from './routes/payment.routes';

// 1. Compilação (Bundling) do Frontend React na inicialização
console.log('Compilando frontend React com o Bun.build...');
const buildResult = await Bun.build({
  entrypoints: ['./src/web/index.tsx'],
  outdir: './dist',
  minify: process.env.NODE_ENV === 'production',
  naming: '[name].[ext]',
});

if (!buildResult.success) {
  console.error('Falha ao compilar frontend:', buildResult.logs);
  process.exit(1);
}
console.log('Frontend e CSS compilados com sucesso!');

// 2. Instanciação dos Handlers de Domínio
const identityHandlers = new IdentityHandlers();
const catalogHandlers = new CatalogHandlers();
const cartHandlers = new CartHandlers();
const addressHandlers = new AddressHandlers();
const favoritesHandlers = new FavoritesHandlers();
const ordersHandlers = new OrdersHandlers();
const paymentHandlers = new PaymentHandlers();

// 3. Configuração do Roteador Hono
const app = new Hono();

// Montagem dos sub-roteadores modulares por domínio
app.route('/api/identity', createIdentityRouter(identityHandlers));
app.route('/api', createCatalogRouter(catalogHandlers));
app.route('/api', createCartRouter(cartHandlers));
app.route('/api', createAddressRouter(addressHandlers));
app.route('/api', createFavoritesRouter(favoritesHandlers));
app.route('/api', createOrdersRouter(ordersHandlers));
app.route('/api', createPaymentRouter(paymentHandlers));

// Roteamento de Mídia e Arquivos Estáticos Públicos
app.get('/uploads/*', async (c) => {
  const decodedPath = decodeURIComponent(c.req.path);
  const file = Bun.file(`./public${decodedPath}`);
  if (await file.exists()) {
    return new Response(file);
  }
  return c.notFound();
});

app.get('/assets/*', async (c) => {
  const decodedPath = decodeURIComponent(c.req.path);
  const file = Bun.file(`./public${decodedPath}`);
  if (await file.exists()) {
    return new Response(file);
  }
  return c.notFound();
});

// Servir o bundle compilado do React SPA
app.get('/index.js', () => {
  const file = Bun.file('./dist/index.js');
  return new Response(file, {
    headers: { 'Content-Type': 'application/javascript' },
  });
});

// Servir o arquivo CSS
app.get('/index.css', () => {
  const file = Bun.file('./src/web/index.css');
  return new Response(file, {
    headers: { 'Content-Type': 'text/css' },
  });
});

// Fallback SPA: qualquer rota não-API serve o index.html
app.get('*', (c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Endpoint não encontrado' }, 404);
  }
  const htmlFile = Bun.file('./src/web/index.html');
  return new Response(htmlFile, {
    headers: { 'Content-Type': 'text/html' },
  });
});

const PORT = Number(process.env.PORT) || 3000;

// 4. Inicialização do servidor HTTP nativo do Bun integrado com Hono
const server = Bun.serve({
  port: PORT,
  fetch: app.fetch,
});

console.log(`Adega virtual rodando em: http://localhost:${server.port}`);

if (process.env.NODE_ENV !== 'test') {
  startCatalogIngestionWorker().catch((err) => {
    console.error('[Worker] Falha ao iniciar worker de ingestão do catálogo:', err);
  });
}

export default server;
