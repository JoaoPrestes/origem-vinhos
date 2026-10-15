import { CatalogRepository } from './catalog.repository';
import { createProductSchema, updateProductSchema } from './schema';
import { getAuthenticatedUser } from '../identity/identity.handlers';
import { ZodError } from 'zod';

const catalogRepository = new CatalogRepository();

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Middleware de verificação de permissão de Administrador
async function checkAdmin(req: Request): Promise<{ errorResponse?: Response; adminId?: string }> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return { errorResponse: jsonResponse({ error: 'Não autorizado. Acesso restrito a usuários autenticados.' }, 401) };
  }
  if (user.profile !== 'Admin') {
    return { errorResponse: jsonResponse({ error: 'Acesso proibido. Apenas administradores podem realizar esta ação.' }, 403) };
  }
  return { adminId: user.id };
}

export class CatalogHandlers {
  // GET /api/catalog
  // Suporta filtros básicos na query string: ?type=Tinto&grape=Malbec&country=Argentina
  async list(req: Request): Promise<Response> {
    if (req.method !== 'GET') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    try {
      const url = new URL(req.url);
      let productsList = await catalogRepository.listActive();

      // Filtros básicos
      const filterType = url.searchParams.get('type');
      const filterGrape = url.searchParams.get('grape');
      const filterCountry = url.searchParams.get('country');

      if (filterType) {
        productsList = productsList.filter(
          p => p.type.toLowerCase() === filterType.toLowerCase()
        );
      }
      if (filterGrape) {
        productsList = productsList.filter(
          p => p.grape.toLowerCase().includes(filterGrape.toLowerCase())
        );
      }
      if (filterCountry) {
        productsList = productsList.filter(
          p => p.country.toLowerCase().includes(filterCountry.toLowerCase())
        );
      }

      return jsonResponse(productsList);
    } catch {
      return jsonResponse({ error: 'Erro interno ao listar vinhos.' }, 500);
    }
  }

  // GET /api/catalog/:id
  async getDetail(req: Request, id: string): Promise<Response> {
    if (req.method !== 'GET') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    try {
      const product = await catalogRepository.findActiveById(id);
      if (!product) {
        return jsonResponse({ error: 'Vinho não encontrado ou indisponível.' }, 404);
      }

      return jsonResponse(product);
    } catch {
      return jsonResponse({ error: 'Erro interno ao obter detalhes do vinho.' }, 500);
    }
  }

  // POST /api/catalog
  async create(req: Request): Promise<Response> {
    const { errorResponse } = await checkAdmin(req);
    if (errorResponse) return errorResponse;

    try {
      if (req.method !== 'POST') {
        return jsonResponse({ error: 'Método não permitido. Utilize POST.' }, 405);
      }

      const body = await req.json();
      const parsedData = createProductSchema.parse(body);

      const newProduct = await catalogRepository.create({
        name: parsedData.name,
        price: parsedData.price.toFixed(2), // Garante formato decimal no Drizzle
        description: parsedData.description,
        image: parsedData.image,
        type: parsedData.type,
        grape: parsedData.grape,
        country: parsedData.country,
        harvest: parsedData.harvest,
        alcohol: parsedData.alcohol.toFixed(2),
      });

      return jsonResponse({ message: 'Vinho cadastrado com sucesso.', product: newProduct }, 201);
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonResponse({ error: 'Erro de validação.', details: error.issues.map(e => e.message) }, 400);
      }
      return jsonResponse({ error: 'Erro interno ao cadastrar vinho.' }, 500);
    }
  }

  // PUT /api/catalog/:id
  async update(req: Request, id: string): Promise<Response> {
    const { errorResponse } = await checkAdmin(req);
    if (errorResponse) return errorResponse;

    try {
      if (req.method !== 'PUT') {
        return jsonResponse({ error: 'Método não permitido. Utilize PUT.' }, 405);
      }

      const body = await req.json();
      const parsedData = updateProductSchema.parse(body);

      const updateData: any = {};
      if (parsedData.name) updateData.name = parsedData.name;
      if (parsedData.price !== undefined) updateData.price = parsedData.price.toFixed(2);
      if (parsedData.description) updateData.description = parsedData.description;
      if (parsedData.image) updateData.image = parsedData.image;
      if (parsedData.type) updateData.type = parsedData.type;
      if (parsedData.grape) updateData.grape = parsedData.grape;
      if (parsedData.country) updateData.country = parsedData.country;
      if (parsedData.harvest) updateData.harvest = parsedData.harvest;
      if (parsedData.alcohol !== undefined) updateData.alcohol = parsedData.alcohol.toFixed(2);

      const updatedProduct = await catalogRepository.update(id, updateData);
      return jsonResponse({ message: 'Vinho atualizado com sucesso.', product: updatedProduct });
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonResponse({ error: 'Erro de validação.', details: error.issues.map(e => e.message) }, 400);
      }
      return jsonResponse({ error: 'Erro interno ao atualizar vinho.' }, 500);
    }
  }

  // DELETE /api/catalog/:id
  async delete(req: Request, id: string): Promise<Response> {
    const { errorResponse } = await checkAdmin(req);
    if (errorResponse) return errorResponse;

    try {
      if (req.method !== 'DELETE') {
        return jsonResponse({ error: 'Método não permitido. Utilize DELETE.' }, 405);
      }

      const success = await catalogRepository.softDelete(id);
      if (!success) {
        return jsonResponse({ error: 'Vinho não encontrado ou já foi excluído logicamente.' }, 404);
      }

      return jsonResponse({ message: 'Vinho excluído logicamente do catálogo com sucesso.' });
    } catch {
      return jsonResponse({ error: 'Erro interno ao excluir vinho.' }, 500);
    }
  }
}
