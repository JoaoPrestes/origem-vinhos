import { UserRepository } from './user.repository';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema, updateProfileSchema } from './schema';
import { ZodError } from 'zod';

const userRepository = new UserRepository();
const authService = new AuthService();

// Função auxiliar para retornar respostas em formato JSON de forma padronizada
function jsonResponse(data: any, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

// Função auxiliar para extrair o usuário autenticado a partir do cabeçalho da requisição
export async function getAuthenticatedUser(req: Request) {
  const cookieHeader = req.headers.get('Cookie');
  const token = authService.extractTokenFromHeader(cookieHeader);
  if (!token) return null;

  const userId = authService.verifySessionToken(token);
  if (!userId) return null;

  return await userRepository.findById(userId);
}

export class IdentityHandlers {
  // POST /api/identity/register
  async register(req: Request): Promise<Response> {
    try {
      if (req.method !== 'POST') {
        return jsonResponse({ error: 'Método não permitido. Utilize POST.' }, 405);
      }

      const body = await req.json();
      const parsedData = registerSchema.parse(body);

      // Verifica se o e-mail já existe
      const existingUser = await userRepository.findByEmail(parsedData.email);
      if (existingUser) {
        return jsonResponse({ error: 'Este e-mail já está cadastrado.' }, 400);
      }

      // Hash da senha e criação do usuário
      const hashedPassword = await authService.hashPassword(parsedData.password);
      const user = await userRepository.createUser({
        name: parsedData.name,
        email: parsedData.email,
        password: hashedPassword,
        birthDate: parsedData.birthDate,
        profile: 'Customer', // Todo cadastro público cria padrão 'Customer'
      });

      // Remove a senha do objeto de retorno por segurança
      const { password, ...safeUser } = user;
      return jsonResponse({ message: 'Cadastro realizado com sucesso.', user: safeUser }, 201);
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonResponse({ error: 'Erro de validação.', details: error.issues.map(e => e.message) }, 400);
      }
      return jsonResponse({ error: 'Erro interno ao realizar cadastro.' }, 500);
    }
  }

  // POST /api/identity/login
  async login(req: Request): Promise<Response> {
    try {
      if (req.method !== 'POST') {
        return jsonResponse({ error: 'Método não permitido. Utilize POST.' }, 405);
      }

      const body = await req.json();
      const parsedData = loginSchema.parse(body);

      // Busca e valida usuário
      const user = await userRepository.findByEmail(parsedData.email);
      if (!user) {
        return jsonResponse({ error: 'Credenciais inválidas.' }, 401);
      }

      const isPasswordValid = await authService.verifyPassword(parsedData.password, user.password);
      if (!isPasswordValid) {
        return jsonResponse({ error: 'Credenciais inválidas.' }, 401);
      }

      // Gera o cookie de sessão HttpOnly
      const cookieHeader = authService.getSetCookieHeader(user.id);
      
      const { password, ...safeUser } = user;
      return jsonResponse(
        { message: 'Login realizado com sucesso.', user: safeUser },
        200,
        { 'Set-Cookie': cookieHeader }
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonResponse({ error: 'Erro de validação.', details: error.issues.map(e => e.message) }, 400);
      }
      return jsonResponse({ error: 'Erro interno ao realizar login.' }, 500);
    }
  }

  // POST /api/identity/logout
  async logout(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Método não permitido. Utilize POST.' }, 405);
    }
    
    // Invalida o cookie enviando Max-Age=0
    const clearCookieHeader = authService.getClearCookieHeader();
    return jsonResponse(
      { message: 'Logout realizado com sucesso.' },
      200,
      { 'Set-Cookie': clearCookieHeader }
    );
  }

  // GET /api/identity/me
  async getProfile(req: Request): Promise<Response> {
    if (req.method !== 'GET') {
      return jsonResponse({ error: 'Método não permitido. Utilize GET.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado. Acesso restrito a usuários autenticados.' }, 401);
    }

    const { password, ...safeUser } = user;
    return jsonResponse({ user: safeUser });
  }

  // PUT /api/identity/me
  async updateProfile(req: Request): Promise<Response> {
    try {
      if (req.method !== 'PUT') {
        return jsonResponse({ error: 'Método não permitido. Utilize PUT.' }, 405);
      }

      const user = await getAuthenticatedUser(req);
      if (!user) {
        return jsonResponse({ error: 'Não autorizado. Acesso restrito a usuários autenticados.' }, 401);
      }

      const body = await req.json();
      const parsedData = updateProfileSchema.parse(body);

      const updateData: any = {};
      if (parsedData.name) updateData.name = parsedData.name;
      if (parsedData.birthDate) updateData.birthDate = parsedData.birthDate;
      
      if (parsedData.email && parsedData.email !== user.email) {
        const existingEmail = await userRepository.findByEmail(parsedData.email);
        if (existingEmail) {
          return jsonResponse({ error: 'Este e-mail já está em uso por outro usuário.' }, 400);
        }
        updateData.email = parsedData.email;
      }

      if (parsedData.password) {
        updateData.password = await authService.hashPassword(parsedData.password);
      }

      const updatedUser = await userRepository.updateUser(user.id, updateData);
      const { password, ...safeUser } = updatedUser;
      
      return jsonResponse({ message: 'Perfil atualizado com sucesso.', user: safeUser });
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonResponse({ error: 'Erro de validação.', details: error.issues.map(e => e.message) }, 400);
      }
      return jsonResponse({ error: 'Erro interno ao atualizar perfil.' }, 500);
    }
  }

  // DELETE /api/identity/me
  async deleteAccount(req: Request): Promise<Response> {
    if (req.method !== 'DELETE') {
      return jsonResponse({ error: 'Método não permitido. Utilize DELETE.' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Não autorizado. Acesso restrito a usuários autenticados.' }, 401);
    }

    const success = await userRepository.deleteUser(user.id);
    if (!success) {
      return jsonResponse({ error: 'Falha ao excluir a conta.' }, 500);
    }

    // Retorna sucesso e invalida o cookie de sessão do usuário deletado
    const clearCookieHeader = authService.getClearCookieHeader();
    return jsonResponse(
      { message: 'Conta excluída com sucesso.' },
      200,
      { 'Set-Cookie': clearCookieHeader }
    );
  }
}
