import { getAuthenticatedUser } from '../identity/identity.handlers';
import { ListFavoritesUseCase } from './use-cases/list-favorites.usecase';
import { ToggleFavoriteUseCase } from './use-cases/toggle-favorite.usecase';
import { RemoveFavoriteUseCase } from './use-cases/remove-favorite.usecase';
import { ZodError } from 'zod';

const listFavoritesUseCase = new ListFavoritesUseCase();
const toggleFavoriteUseCase = new ToggleFavoriteUseCase();
const removeFavoriteUseCase = new RemoveFavoriteUseCase();

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export class FavoritesHandlers {
  // GET /api/favorites
  async list(req: Request): Promise<Response> {
    if (req.method !== 'GET') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado. Acesso restrito a usuários autenticados.' }, 401);
    }

    if (user.profile === 'Admin') {
      return jsonResponse({ error: 'Acesso proibido. Administradores não possuem lista de favoritos.' }, 403);
    }

    try {
      const favoritesList = await listFavoritesUseCase.execute(user.id);
      return jsonResponse(favoritesList);
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro interno ao listar favoritos.' }, 500);
    }
  }

  // GET /api/favorites/ids
  async getFavoriteIds(req: Request): Promise<Response> {
    if (req.method !== 'GET') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ ids: [] });
    }

    if (user.profile === 'Admin') {
      return jsonResponse({ ids: [] });
    }

    try {
      const ids = await listFavoritesUseCase.getIds(user.id);
      return jsonResponse({ ids });
    } catch {
      return jsonResponse({ ids: [] });
    }
  }

  // POST /api/favorites/toggle
  async toggle(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado. Faça login para favoritar vinhos.' }, 401);
    }

    if (user.profile === 'Admin') {
      return jsonResponse({ error: 'Acesso proibido. Administradores não possuem lista de favoritos.' }, 403);
    }

    try {
      const body = await req.json();
      const result = await toggleFavoriteUseCase.execute(user.id, body);
      return jsonResponse(result);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return jsonResponse({ error: 'Erro de validação.', details: error.issues.map(e => e.message) }, 400);
      }
      return jsonResponse({ error: error.message || 'Erro ao alternar favorito.' }, 400);
    }
  }

  // DELETE /api/favorites/:productId
  async remove(req: Request, productId: string): Promise<Response> {
    if (req.method !== 'DELETE') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado.' }, 401);
    }

    if (user.profile === 'Admin') {
      return jsonResponse({ error: 'Acesso proibido. Administradores não possuem lista de favoritos.' }, 403);
    }

    try {
      await removeFavoriteUseCase.execute(user.id, productId);
      return jsonResponse({ message: 'Vinho removido dos favoritos com sucesso.' });
    } catch (error: any) {
      return jsonResponse({ error: error.message || 'Erro ao remover dos favoritos.' }, 500);
    }
  }
}
