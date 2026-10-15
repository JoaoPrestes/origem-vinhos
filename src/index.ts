import { IdentityHandlers } from './domains/identity/identity.handlers';
import { CatalogHandlers } from './domains/catalog/catalog.handlers';
import { handleFileUpload } from './domains/catalog/upload.handlers';
import { CartHandlers } from './domains/cart/cart.handlers';
import { AddressHandlers } from './domains/address/address.handlers';
import { FavoritesHandlers } from './domains/favorites/favorites.handlers';
import { OrdersHandlers } from './domains/orders/orders.handlers';
import { PaymentHandlers } from './domains/payment/payment.handlers';

const identityHandlers = new IdentityHandlers();
const catalogHandlers = new CatalogHandlers();
const cartHandlers = new CartHandlers();
const addressHandlers = new AddressHandlers();
const favoritesHandlers = new FavoritesHandlers();
const ordersHandlers = new OrdersHandlers();
const paymentHandlers = new PaymentHandlers();

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
await Bun.write('./dist/index.css', Bun.file('./src/web/index.css'));
console.log('Frontend e CSS compilados com sucesso!');

const PORT = process.env.PORT || 3000;

// 2. Inicialização do servidor HTTP nativo do Bun
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // ==========================================
    // Roteamento dos Handlers de Identity
    // ==========================================
    if (url.pathname === '/api/identity/register') {
      return await identityHandlers.register(req);
    }
    if (url.pathname === '/api/identity/login') {
      return await identityHandlers.login(req);
    }
    if (url.pathname === '/api/identity/logout') {
      return await identityHandlers.logout(req);
    }
    if (url.pathname === '/api/identity/me') {
      if (req.method === 'GET') return await identityHandlers.getProfile(req);
      if (req.method === 'PUT') return await identityHandlers.updateProfile(req);
      if (req.method === 'DELETE') return await identityHandlers.deleteAccount(req);
    }

    // ==========================================
    // Roteamento dos Handlers de Catalog & Upload
    // ==========================================
    if (url.pathname === '/api/upload') {
      if (req.method === 'POST') return await handleFileUpload(req);
    }

    if (url.pathname.startsWith('/uploads/')) {
      const decodedPath = decodeURIComponent(url.pathname);
      const file = Bun.file(`./public${decodedPath}`);
      if (await file.exists()) {
        return new Response(file);
      }
    }

    if (url.pathname === '/api/catalog') {
      if (req.method === 'GET') return await catalogHandlers.list(req);
      if (req.method === 'POST') return await catalogHandlers.create(req);
    }
    
    // Regex para capturar /api/catalog/:id
    const catalogIdMatch = url.pathname.match(/^\/api\/catalog\/([a-f0-9-]+)$/);
    if (catalogIdMatch && catalogIdMatch[1]) {
      const id = catalogIdMatch[1];
      if (req.method === 'GET') return await catalogHandlers.getDetail(req, id);
      if (req.method === 'PUT') return await catalogHandlers.update(req, id);
      if (req.method === 'DELETE') return await catalogHandlers.delete(req, id);
    }

    // ==========================================
    // Roteamento dos Handlers de Cart
    // ==========================================
    if (url.pathname === '/api/cart') {
      if (req.method === 'GET') return await cartHandlers.getCart(req);
      if (req.method === 'POST') return await cartHandlers.addItem(req);
      if (req.method === 'DELETE') return await cartHandlers.clear(req);
    }

    // Regex para capturar /api/cart/:itemId
    const cartItemIdMatch = url.pathname.match(/^\/api\/cart\/([a-f0-9-]+)$/);
    if (cartItemIdMatch && cartItemIdMatch[1]) {
      const itemId = cartItemIdMatch[1];
      if (req.method === 'PUT') return await cartHandlers.updateItemQuantity(req, itemId);
      if (req.method === 'DELETE') return await cartHandlers.removeItem(req, itemId);
    }

    // ==========================================
    // Roteamento dos Handlers de Address
    // ==========================================
    if (url.pathname === '/api/addresses') {
      if (req.method === 'GET') return await addressHandlers.list(req);
      if (req.method === 'POST') return await addressHandlers.create(req);
    }

    // Regex para CEP Lookup: /api/addresses/lookup-cep/:cep
    const lookupCepMatch = url.pathname.match(/^\/api\/addresses\/lookup-cep\/([0-9-]{8,9})$/);
    if (lookupCepMatch && lookupCepMatch[1]) {
      return await addressHandlers.lookupCep(req, lookupCepMatch[1]);
    }

    // Regex para capturar /api/addresses/:id/default
    const addressDefaultMatch = url.pathname.match(/^\/api\/addresses\/([a-f0-9-]+)\/default$/);
    if (addressDefaultMatch && addressDefaultMatch[1]) {
      return await addressHandlers.setDefault(req, addressDefaultMatch[1]);
    }

    // Regex para capturar /api/addresses/:id
    const addressIdMatch = url.pathname.match(/^\/api\/addresses\/([a-f0-9-]+)$/);
    if (addressIdMatch && addressIdMatch[1]) {
      const id = addressIdMatch[1];
      if (req.method === 'PUT') return await addressHandlers.update(req, id);
      if (req.method === 'DELETE') return await addressHandlers.delete(req, id);
    }

    // ==========================================
    // Roteamento dos Handlers de Favorites
    // ==========================================
    if (url.pathname === '/api/favorites') {
      if (req.method === 'GET') return await favoritesHandlers.list(req);
    }

    if (url.pathname === '/api/favorites/ids') {
      if (req.method === 'GET') return await favoritesHandlers.getFavoriteIds(req);
    }

    if (url.pathname === '/api/favorites/toggle') {
      if (req.method === 'POST') return await favoritesHandlers.toggle(req);
    }

    // Regex para capturar /api/favorites/:productId
    const favoriteIdMatch = url.pathname.match(/^\/api\/favorites\/([a-f0-9-]+)$/);
    if (favoriteIdMatch && favoriteIdMatch[1]) {
      const productId = favoriteIdMatch[1];
      if (req.method === 'DELETE') return await favoritesHandlers.remove(req, productId);
    }

    // ==========================================
    // Roteamento dos Handlers de Orders
    // ==========================================
    if (url.pathname === '/api/orders') {
      if (req.method === 'GET') return await ordersHandlers.listOrders(req);
      if (req.method === 'POST') return await ordersHandlers.createOrder(req);
    }

    const orderCancelMatch = url.pathname.match(/^\/api\/orders\/([a-f0-9-]+)\/cancel$/);
    if (orderCancelMatch && orderCancelMatch[1]) {
      return await ordersHandlers.cancelOrder(req, orderCancelMatch[1]);
    }

    const orderIdMatch = url.pathname.match(/^\/api\/orders\/([a-f0-9-]+)$/);
    if (orderIdMatch && orderIdMatch[1]) {
      return await ordersHandlers.getOrderDetails(req, orderIdMatch[1]);
    }

    // ==========================================
    // Roteamento dos Handlers de Payment
    // ==========================================
    if (url.pathname === '/api/payments') {
      if (req.method === 'POST') return await paymentHandlers.createPayment(req);
    }

    const paymentStatusMatch = url.pathname.match(/^\/api\/payments\/([a-f0-9-]+)\/status$/);
    if (paymentStatusMatch && paymentStatusMatch[1]) {
      return await paymentHandlers.getPaymentStatus(req, paymentStatusMatch[1]);
    }

    if (url.pathname === '/api/payments/webhook') {
      return await paymentHandlers.handleWebhook(req);
    }

    // ==========================================
    // Roteamento dos Arquivos do Frontend (SPA)
    // ==========================================
    
    // Servir o arquivo compilado do Javascript do React
    if (url.pathname === '/index.js') {
      const file = Bun.file('./dist/index.js');
      return new Response(file, {
        headers: { 'Content-Type': 'application/javascript' },
      });
    }

    // Servir o arquivo CSS diretamente do fonte (atualização instantânea ao recarregar a página sem recompilar)
    if (url.pathname === '/index.css') {
      const file = Bun.file('./src/web/index.css');
      return new Response(file, {
        headers: { 'Content-Type': 'text/css' },
      });
    }

    // Rota Fallback para qualquer navegação (Roteamento SPA) - serve index.html
    const htmlFile = Bun.file('./src/web/index.html');
    return new Response(htmlFile, {
      headers: { 'Content-Type': 'text/html' },
    });
  },
});

console.log(`Adega virtual rodando em: http://localhost:${server.port}`);
