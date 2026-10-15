import { CartRepository } from './cart.repository';
import { CatalogRepository } from '../catalog/catalog.repository';
import { CartService } from './cart.service';
import { addToCartSchema, updateCartItemSchema } from './schema';
import { getAuthenticatedUser } from '../identity/identity.handlers';
import { ZodError } from 'zod';

const cartRepository = new CartRepository();
const catalogRepository = new CatalogRepository();
const cartService = new CartService();

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export class CartHandlers {
  // GET /api/cart
  // Retorna os itens do carrinho do usuário autenticado e calcula o subtotal e o total
  async getCart(req: Request): Promise<Response> {
    if (req.method !== 'GET') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado. Faça login para acessar o carrinho.' }, 401);
    }

    try {
      const cartData = await cartService.getActiveCart(user.id);
      return jsonResponse(cartData);
    } catch {
      return jsonResponse({ error: 'Erro interno ao consultar o carrinho.' }, 500);
    }
  }

  // POST /api/cart
  // Adiciona um vinho ao carrinho ou incrementa a quantidade se já existir
  async addItem(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Método não permitido. Utilize POST.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado. Faça login para adicionar itens ao carrinho.' }, 401);
    }

    try {
      const body = await req.json();
      const parsedData = addToCartSchema.parse(body);

      // Valida se o produto existe no catálogo e se está ativo (não excluído logicamente)
      const wine = await catalogRepository.findActiveById(parsedData.productId);
      if (!wine) {
        return jsonResponse({ error: 'Vinho não encontrado ou inativo no catálogo.' }, 404);
      }

      // Verifica se o item já está no carrinho
      const existingItem = await cartRepository.findByUserAndProduct(user.id, parsedData.productId);
      
      let cartItem;
      if (existingItem) {
        // Se já existe, apenas incrementa a quantidade
        const newQty = existingItem.quantity + parsedData.quantity;
        cartItem = await cartRepository.updateQuantity(existingItem.id, newQty);
      } else {
        // Se não existe, cria um novo item no carrinho
        cartItem = await cartRepository.addItem({
          userId: user.id,
          productId: parsedData.productId,
          quantity: parsedData.quantity,
        });
      }

      return jsonResponse({ message: 'Vinho adicionado ao carrinho com sucesso.', item: cartItem }, 200);
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonResponse({ error: 'Erro de validação.', details: error.issues.map(e => e.message) }, 400);
      }
      return jsonResponse({ error: 'Erro interno ao adicionar item ao carrinho.' }, 500);
    }
  }

  // PUT /api/cart/:itemId
  // Atualiza a quantidade de um item no carrinho. Se quantidade <= 0, remove o item
  async updateItemQuantity(req: Request, itemId: string): Promise<Response> {
    if (req.method !== 'PUT') {
      return jsonResponse({ error: 'Método não permitido. Utilize PUT.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado. Faça login para gerenciar o carrinho.' }, 401);
    }

    try {
      const body = await req.json();
      const parsedData = updateCartItemSchema.parse(body);
      
      // Validação de segurança: garantir que o item pertence de fato ao usuário autenticado
      const items = await cartRepository.listByUser(user.id);
      const userHasItem = items.some(item => item.id === itemId);
      
      if (!userHasItem) {
        return jsonResponse({ error: 'Item do carrinho não encontrado ou não pertence a este usuário.' }, 404);
      }

      if (parsedData.quantity <= 0) {
        // Quantidade zero ou menor aciona exclusão automática do item
        await cartRepository.removeItem(itemId);
        return jsonResponse({ message: 'Item removido do carrinho com sucesso.' });
      }

      // Atualiza a quantidade
      const updatedItem = await cartRepository.updateQuantity(itemId, parsedData.quantity);
      return jsonResponse({ message: 'Quantidade atualizada com sucesso.', item: updatedItem });
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonResponse({ error: 'Erro de validação.', details: error.issues.map(e => e.message) }, 400);
      }
      return jsonResponse({ error: 'Erro interno ao atualizar quantidade do item.' }, 500);
    }
  }

  // DELETE /api/cart
  // Limpa/esvazia completamente o carrinho de compras do usuário logado
  async clear(req: Request): Promise<Response> {
    if (req.method !== 'DELETE') {
      return jsonResponse({ error: 'Método não permitido. Utilize DELETE.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado. Faça login para limpar o carrinho.' }, 401);
    }

    try {
      await cartRepository.clearCart(user.id);
      return jsonResponse({ message: 'Carrinho esvaziado com sucesso.' });
    } catch (err) {
      console.error("ERRO AO ESVAZIAR CARRINHO:", err);
      return jsonResponse({ error: 'Erro interno ao esvaziar o carrinho.' }, 500);
    }
  }

  // DELETE /api/cart/:itemId
  // Remove um item específico do carrinho
  async removeItem(req: Request, itemId: string): Promise<Response> {
    if (req.method !== 'DELETE') {
      return jsonResponse({ error: 'Método não permitido. Utilize DELETE.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado. Faça login para gerenciar o carrinho.' }, 401);
    }

    try {
      // Validação de segurança: garantir que o item pertence ao usuário
      const items = await cartRepository.listByUser(user.id);
      const userHasItem = items.some(item => item.id === itemId);
      
      if (!userHasItem) {
        return jsonResponse({ error: 'Item do carrinho não encontrado ou não pertence a este usuário.' }, 404);
      }

      await cartRepository.removeItem(itemId);
      return jsonResponse({ message: 'Item removido do carrinho com sucesso.' });
    } catch {
      return jsonResponse({ error: 'Erro interno ao remover item do carrinho.' }, 500);
    }
  }
}
