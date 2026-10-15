import { AddressService } from './address.service';
import { getAuthenticatedUser } from '../identity/identity.handlers';
import { ZodError } from 'zod';

const addressService = new AddressService();

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export class AddressHandlers {
  // GET /api/addresses
  async list(req: Request): Promise<Response> {
    if (req.method !== 'GET') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado. Faça login para acessar seus endereços.' }, 401);
    }

    try {
      const addresses = await addressService.getUserAddresses(user.id);
      return jsonResponse({ addresses });
    } catch {
      return jsonResponse({ error: 'Erro interno ao consultar endereços.' }, 500);
    }
  }

  // POST /api/addresses
  async create(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado. Faça login para cadastrar um endereço.' }, 401);
    }

    try {
      const body = await req.json();
      const newAddress = await addressService.createAddress(user.id, body);
      return jsonResponse({ address: newAddress, message: 'Endereço cadastrado com sucesso.' }, 201);
    } catch (err: any) {
      if (err instanceof ZodError) {
        return jsonResponse({ error: 'Dados inválidos.', details: err.issues }, 400);
      }
      return jsonResponse({ error: err.message || 'Erro interno ao cadastrar endereço.' }, 400);
    }
  }

  // PUT /api/addresses/:id
  async update(req: Request, id: string): Promise<Response> {
    if (req.method !== 'PUT') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado.' }, 401);
    }

    try {
      const body = await req.json();
      const updatedAddress = await addressService.updateAddress(id, user.id, body);
      return jsonResponse({ address: updatedAddress, message: 'Endereço atualizado com sucesso.' }, 200);
    } catch (err: any) {
      if (err instanceof ZodError) {
        return jsonResponse({ error: 'Dados inválidos.', details: err.issues }, 400);
      }
      return jsonResponse({ error: err.message || 'Erro ao atualizar endereço.' }, 400);
    }
  }

  // DELETE /api/addresses/:id
  async delete(req: Request, id: string): Promise<Response> {
    if (req.method !== 'DELETE') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado.' }, 401);
    }

    try {
      await addressService.deleteAddress(id, user.id);
      return jsonResponse({ message: 'Endereço excluído com sucesso.' }, 200);
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao excluir endereço.' }, 400);
    }
  }

  // PUT /api/addresses/:id/default
  async setDefault(req: Request, id: string): Promise<Response> {
    if (req.method !== 'PUT') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado.' }, 401);
    }

    try {
      const updatedAddress = await addressService.setDefaultAddress(id, user.id);
      return jsonResponse({ address: updatedAddress, message: 'Endereço padrão atualizado.' }, 200);
    } catch (err: any) {
      return jsonResponse({ error: err.message || 'Erro ao definir endereço padrão.' }, 400);
    }
  }

  // GET /api/addresses/lookup-cep/:cep
  async lookupCep(req: Request, cep: string): Promise<Response> {
    if (req.method !== 'GET') {
      return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado. Faça login para consultar CEP.' }, 401);
    }

    try {
      const result = await addressService.lookupCep(cep);
      return jsonResponse(result, result.found ? 200 : 404);
    } catch (err: any) {
      return jsonResponse({ error: 'Erro ao consultar CEP.' }, 500);
    }
  }
}
